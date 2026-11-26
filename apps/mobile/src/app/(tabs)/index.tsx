import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import type { ColorName, Garment, Occasion, ScoredOutfit } from "@styleme/schema";
import { occasionLabel, occasions, paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Confirm, Display, Empty, Screen, Scroll, Title } from "@/components/ui";
import { OutfitBadge, Toast, WhyPanel } from "@/components/why-panel";
import { bumpFunnel, listGarments, logSuggestion, logWear, metaGet, upsertGarment } from "@/lib/db";
import { depthRead } from "@/lib/wardrobe-depth";
import { onAuthLocked } from "@/lib/api";
import { useToneProfile, voice } from "@/lib/tone";
import { useTheme } from "@/lib/theme";
import { drain, enqueueLearn, enqueueWardrobe } from "@/lib/sync-queue";
import {
  claimStreakCelebration,
  getWearCount,
  getWearStreak,
  getWeather,
  isStreakMilestone,
  loadPrefs,
  recommendLocal,
  recordPick,
  resetDeviceIdentity,
  savePrefs,
  sessionTarget,
  type LocalToday,
  type Weather,
  type WearStreak,
} from "@/lib/local";

/** React purity lint: keep the impure clock call out of the component body. */
const nowMs = () => Date.now();

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function Today() {
  const router = useRouter();
  const tone = useToneProfile();
  const t = useTheme();
  const reduce = useReducedMotion();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [available, setAvailable] = useState<Garment[]>([]);
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [weather, setWeather] = useState<Weather>({ tempC: 18, isRaining: false });
  const [today, setToday] = useState<LocalToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<ScoredOutfit | null>(null);
  const [firstOutfit, setFirstOutfit] = useState(false);
  const [streak, setStreak] = useState<WearStreak>({ days: 0 });
  const [seed, setSeed] = useState(0);
  const [name, setName] = useState<string | null>(null);
  // T-067: onboarding size guess (clamped 10–60) — the depth target.
  const [target, setTarget] = useState(30);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [error, setError] = useState(false);
  // T-059: worker registration is locked (403 registration_locked). Offer the
  // consent-gated recovery once per session — never auto-reset.
  const [reconnect, setReconnect] = useState(false);
  const reconnectDismissed = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onAuthLocked(() => {
      if (!reconnectDismissed.current) setReconnect(true);
    });
  }, []);

  async function confirmReconnect() {
    setReconnect(false);
    // Local wardrobe/prefs stay; the old worker identity is abandoned and a
    // fresh device id registers on the next drain — retry the queue once.
    await resetDeviceIdentity();
    void drain();
  }

  const load = useCallback(async () => {
    setLoading(true);
    setPicked(null);
    setFirstOutfit(false);
    setError(false);
    try {
      const all = await listGarments();
      const free = all.filter((g) => g.status === "available");
      setGarments(all);
      setAvailable(free);
      const w = await getWeather();
      setWeather(w);
      setName(await metaGet("name"));
      setTarget(await sessionTarget());
      setStreak(await getWearStreak());
      if (free.length >= 3) {
        const result = await recommendLocal(free, occasion, w, seed);
        // Keep the result even when a never-mix rule emptied it — the skip
        // line ("skipped rust + pink — you said never") must survive.
        const keep = result.outfits.length > 0 || result.skippedNeverMix.length > 0;
        setToday(keep ? result : null);
        if (keep) {
          // Learning loop: record the offer locally, then ship it + the
          // wardrobe snapshot to the worker when connectivity allows.
          await logSuggestion(result.outfits, null, result.context);
          await enqueueWardrobe(all, nowMs());
          void drain();
        }
      } else {
        setToday(null);
      }
    } catch {
      setToday(null);
      // Engine/data failure is not "need more pieces" — say so honestly.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [occasion, seed]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string, undo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  /**
   * Never-mix a color pair (long-press on a reason). Saved to prefs, the
   * engine hard-filters it from now on, and the toast offers an undo.
   */
  async function neverMix(pair: [ColorName, ColorName]) {
    const [colorA, colorB] = pair;
    const prefs = await loadPrefs();
    const dup = prefs.neverMix.some(
      (m) =>
        (m.colorA === colorA && m.colorB === colorB) ||
        (m.colorA === colorB && m.colorB === colorA),
    );
    if (dup) {
      showToast(`Already skipping ${colorA} + ${colorB} combos.`);
      return;
    }
    await savePrefs({ ...prefs, neverMix: [...prefs.neverMix, { colorA, colorB }] });
    void load();
    showToast(`Never mixing ${colorA} + ${colorB} again.`, async () => {
      const p = await loadPrefs();
      await savePrefs({
        ...p,
        neverMix: p.neverMix.filter(
          (m) =>
            !(
              (m.colorA === colorA && m.colorB === colorB) ||
              (m.colorA === colorB && m.colorB === colorA)
            ),
        ),
      });
      void load();
    });
  }

  /** Last-resort recovery when never-mix rules filter every candidate. */
  async function undoLastNeverMix() {
    const prefs = await loadPrefs();
    if (prefs.neverMix.length === 0) return;
    await savePrefs({ ...prefs, neverMix: prefs.neverMix.slice(0, -1) });
    void load();
  }

  async function pick(outfit: ScoredOutfit) {
    if (!today) return;
    const isFirstOutfit = (await getWearCount()) === 0;
    await recordPick(available, outfit, today.outfits, today.context);
    await logWear(outfit.garmentIds, occasion, nowMs());
    // Learning loop: the pick is the strongest signal — queue it for the
    // worker. Log exactly what was offered (depth mode shows one card).
    const offered = shownOutfits ?? [];
    await enqueueLearn({
      suggestedIds: offered.map((o) => o.garmentIds),
      pickedId: outfit.garmentIds.join("+"),
      context: today.context,
      ts: nowMs(),
    });
    // Confirmed: a short success haptic, not a celebration.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFirstOutfit(isFirstOutfit);
    await bumpFunnel("wear_logged");
    if (isFirstOutfit) await bumpFunnel("first_wear");
    setPicked(outfit);

    const nextStreak = await getWearStreak();
    setStreak(nextStreak);
    // One tone-voiced milestone toast per streak per day, never on every pick.
    if (await claimStreakCelebration(nextStreak.days)) {
      await bumpFunnel("streak_milestone");
      showToast(voice("streak", tone, "streak"));
    }
  }

  /**
   * "None of these? Shuffle" is the spec'd explicit-rejection moment: the
   * offered three were seen and passed over. Queue the learn event with
   * pickedId null (worker records the explore-state update), then reshuffle.
   */
  function rejectAndShuffle() {
    if (today) {
      // Learning loop: log exactly what was OFFERED. In depth mode that is
      // the one shown card — never the two unseen near-twins.
      const offered = shownOutfits ?? [];
      void enqueueLearn({
        suggestedIds: offered.map((o) => o.garmentIds),
        pickedId: null,
        context: today.context,
        ts: nowMs(),
      });
    }
    setSeed((x) => x + 1);
  }

  const byId = new Map(garments.map((g) => [g.id, g]));
  const owned = new Set(available.map((g) => g.attrs.slot));
  const missing: string[] = [];
  if (!owned.has("shoes")) missing.push("shoes");
  if (!((owned.has("top") && owned.has("bottom")) || owned.has("dress"))) {
    missing.push("a top + bottom (or a dress)");
  }

  const hour = new Date().getHours();
  const partKey =
    hour < 12 ? "greeting_morning" : hour < 18 ? "greeting_afternoon" : "greeting_evening";
  const greeting = name ? `${capitalize(voice(partKey, tone))}, ${name}` : "Today";
  const bestScore = today ? Math.max(...today.outfits.map((o) => o.score)) : 0;

  // T-067 depth register: below 15 photo'd pieces the engine's near-twin
  // options read as noise — lead with one strong look + an honest line.
  const depth = depthRead(garments, target);
  const depthMode = depth.photoPieces < 15 && (today?.outfits.length ?? 0) > 0;
  const shownOutfits = depthMode ? today?.outfits.slice(0, 1) : today?.outfits;
  /** Share of an outfit's garments that have photos — badges need ≥60%. */
  const photoCovered = (outfit: ScoredOutfit): boolean => {
    if (outfit.garmentIds.length === 0) return false;
    const withPhoto = outfit.garmentIds.filter((id) => byId.get(id)?.photoRef).length;
    return withPhoto / outfit.garmentIds.length >= 0.6;
  };

  async function seedDemo() {
    const demo = [
      { slot: "top", colors: ["white"], pattern: "solid", fit: "regular", formality: 2, season: "all", material: "light" },
      { slot: "bottom", colors: ["navy"], pattern: "solid", fit: "regular", formality: 2, season: "all", material: "medium" },
      { slot: "shoes", colors: ["white"], pattern: "solid", fit: "regular", formality: 2, season: "all", material: "medium" },
      { slot: "outerwear", colors: ["black"], pattern: "solid", fit: "regular", formality: 3, season: "cool", material: "heavy" },
      { slot: "top", colors: ["cream"], pattern: "solid", fit: "relaxed", formality: 3, season: "cool", material: "medium" },
      { slot: "bottom", colors: ["black"], pattern: "solid", fit: "slim", formality: 3, season: "all", material: "medium" },
    ] as const;
    for (let i = 0; i < demo.length; i++) {
      await upsertGarment({
        id: `demo_${i}`,
        attrs: { ...demo[i], colors: [...demo[i].colors] } as Garment["attrs"],
        status: "available",
        photoRef: "",
        addedAt: Date.now(),
        lastWornAt: null,
        corrections: [],
      });
    }
    setSeed((x) => x + 1);
  }

  return (
    <Screen>
      <Scroll>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Display>{greeting}</Display>
            <Caption>
              {weather.city
                ? `${weather.city} · `
                : `${voice("weather_line", tone)} · `}
              {Math.round(weather.tempC)}°
              {weather.source === "fallback" ? " · offline guess" : ""}
              {weather.isRaining ? " · rain" : ""} · {available.length} pieces ready
            </Caption>
          </View>
          <Btn label="Shuffle" variant="ghost" onPress={() => setSeed((x) => x + 1)} />
        </View>

        <View style={s.chips}>
          {occasions.map((o) => (
            <Chip
              key={o}
              label={occasionLabel[o] ?? o}
              selected={occasion === o}
              onPress={() => setOccasion(o)}
            />
          ))}
        </View>

        {today?.skippedNeverMix.map(([a, b]) => (
          <Caption key={`${a}|${b}`}>Skipped {a} + {b} combos — you said never.</Caption>
        ))}

        {streak.days >= 2 && (
          <Card
            style={{
              gap: space.xs,
              borderColor: isStreakMilestone(streak.days) ? t.accent : t.line,
            }}>
            <Caption>{voice("streak", tone, "streak")}</Caption>
            <Title>
              {streak.days} days in a row
            </Title>
          </Card>
        )}

        {loading && (
          <Card style={{ alignItems: "center", gap: space.s }}>
            <ActivityIndicator color={t.accent} />
            <Caption>Styling three options…</Caption>
          </Card>
        )}

        {!loading && error && !today && (
          <Card style={{ gap: space.s, borderColor: t.bad }}>
            <Title>Something went wrong.</Title>
            <Caption>Your wardrobe is safe on this phone — the styling pass just failed. Try again.</Caption>
            <Btn label="Try again" onPress={() => void load()} />
          </Card>
        )}

        {picked && (
          <Card style={{ borderColor: firstOutfit ? t.accent : t.ok }}>
            <Caption>{firstOutfit ? voice("first_outfit", tone, "first") : "Worn."}</Caption>
            <Title>{firstOutfit ? "First one's logged." : "Logged it."}</Title>
            <Caption>It rests for a couple of days so you don&apos;t repeat it.</Caption>
          </Card>
        )}

        {!loading && !today && !error && (
          <Empty
            title="Need a few more pieces."
            body={
              available.length === 0
                ? "Add your first top, bottom, and shoes. Photos stay on your phone."
                : missing.length > 0
                  ? `Still missing: ${missing.join(" and ")}. Add those and 3 outfits appear.`
                  : "Those pieces don't form a complete outfit yet. Add shoes or a dress, or try the demo."
            }
            action={
              <View style={{ gap: space.s, alignSelf: "stretch" }}>
                <Btn label="Add clothes" onPress={() => router.push("/(tabs)/capture")} />
                <Btn label="Try a demo wardrobe" variant="ghost" onPress={() => void seedDemo()} />
              </View>
            }
          />
        )}

        {!loading && today && today.outfits.length === 0 && (
          <Empty
            title="Nothing left to wear?"
            body="Every option here breaks one of your rules."
            action={
              <View style={{ gap: space.s, alignSelf: "stretch" }}>
                <Btn label="Undo last rule" onPress={() => void undoLastNeverMix()} />
                <Btn label="Add clothes" variant="ghost" onPress={() => router.push("/(tabs)/capture")} />
                <Btn label="Shuffle" variant="ghost" onPress={() => setSeed((x) => x + 1)} />
              </View>
            }
          />
        )}

        {shownOutfits?.map((outfit, i) => (
          // Staggered entrance — and the shuffle moment: new options mount
          // with fresh keys, so the reshuffle lands as a soft cascade
          // instead of an instant re-render. Reduce-motion: no cascade.
          <Animated.View
            key={outfit.garmentIds.join("+")}
            entering={reduce ? undefined : FadeInDown.duration(260).delay(i * 90)}>
            <Card style={{ gap: space.m }}>
              <View style={s.rowBetween}>
                <Caption>Option {i + 1}</Caption>
                {photoCovered(outfit) && <OutfitBadge score={outfit.score} best={bestScore} />}
              </View>
              <View style={s.thumbs}>
                {outfit.garmentIds.map((id) => {
                  const g = byId.get(id);
                  if (!g)
                    return (
                      <View
                        key={id}
                        style={[s.thumb, { backgroundColor: t.surfaceAlt, borderColor: t.line }]}
                      />
                    );
                  return g.photoRef ? (
                    <Image key={id} source={{ uri: g.photoRef }} style={[s.thumb, { borderColor: t.line }]} />
                  ) : (
                    <View
                      key={id}
                      style={[
                        s.thumb,
                        {
                          backgroundColor: paletteSwatch[g.attrs.colors[0]] ?? t.surfaceAlt,
                          borderColor: t.line,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <WhyPanel outfit={outfit} byId={byId} onNeverMix={(pair) => void neverMix(pair)} />
              <Btn
                label={picked?.garmentIds.join("+") === outfit.garmentIds.join("+") ? "Picked" : "Wear this"}
                onPress={() => void pick(outfit)}
                disabled={!!picked}
              />
            </Card>
          </Animated.View>
        ))}

        {depthMode && (
          <Card style={{ gap: space.s }}>
            <Caption>{voice("depth_line", tone)}</Caption>
            {depth.unlock && (
              <Caption>
                A {depth.unlock.label} here adds {depth.unlock.unlocks} fresh combination
                {depth.unlock.unlocks === 1 ? "" : "s"}.
              </Caption>
            )}
            <Btn label="Add clothes" variant="ghost" onPress={() => router.push("/(tabs)/capture")} />
          </Card>
        )}

        {today && today.outfits.length > 0 && (
          <Pressable onPress={rejectAndShuffle} style={s.notToday}>
            <Caption>
              {depthMode ? "None of these? Shuffle for another." : "None of these? Shuffle the 3 options."}
            </Caption>
          </Pressable>
        )}
      </Scroll>
      {toast && (
        <Toast
          message={toast.message}
          onUndo={
            toast.undo
              ? () => {
                  toast.undo?.();
                  setToast(null);
                }
              : undefined
          }
        />
      )}
      <Confirm
        visible={reconnect}
        title="This device needs to reconnect"
        body="Your wardrobe and preferences stay right here on this phone. The old cloud link is signed out and can't be recovered without its security key — reconnecting starts a fresh one."
        confirmLabel="Reconnect"
        cancelLabel="Not now"
        onConfirm={() => void confirmReconnect()}
        onCancel={() => {
          reconnectDismissed.current = true;
          setReconnect(false);
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.m },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  thumbs: { flexDirection: "row", gap: space.s },
  thumb: { flex: 1, aspectRatio: 0.8, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth },
  notToday: { alignItems: "center", paddingVertical: space.m },
});
