import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { ColorName, Garment, Occasion, ScoredOutfit } from "@styleme/schema";
import { occasionLabel, occasions, paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Display, Empty, Screen, Scroll, Title } from "@/components/ui";
import { OutfitBadge, Toast, WhyPanel } from "@/components/why-panel";
import { listGarments, logWear, metaGet, upsertGarment } from "@/lib/db";
import { useToneProfile, voice } from "@/lib/tone";
import { useTheme } from "@/lib/theme";
import {
  getWeather,
  loadPrefs,
  recommendLocal,
  recordPick,
  savePrefs,
  type LocalToday,
  type Weather,
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
  const [garments, setGarments] = useState<Garment[]>([]);
  const [available, setAvailable] = useState<Garment[]>([]);
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [weather, setWeather] = useState<Weather>({ tempC: 18, isRaining: false });
  const [today, setToday] = useState<LocalToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<ScoredOutfit | null>(null);
  const [seed, setSeed] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPicked(null);
    try {
      const all = await listGarments();
      const free = all.filter((g) => g.status === "available");
      setGarments(all);
      setAvailable(free);
      const w = await getWeather();
      setWeather(w);
      setName(await metaGet("name"));
      if (free.length >= 3) {
        const result = await recommendLocal(free, occasion, w, seed);
        // Keep the result even when a never-mix rule emptied it — the skip
        // line ("skipped rust + pink — you said never") must survive.
        const keep = result.outfits.length > 0 || result.skippedNeverMix.length > 0;
        setToday(keep ? result : null);
      } else {
        setToday(null);
      }
    } catch {
      setToday(null);
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
    await recordPick(available, outfit, today.outfits, today.context);
    await logWear(outfit.garmentIds, occasion, nowMs());
    setPicked(outfit);
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
              {voice("weather_line", tone)} · {Math.round(weather.tempC)}°
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

        {loading && (
          <Card style={{ alignItems: "center", gap: space.s }}>
            <ActivityIndicator color={t.accent} />
            <Caption>Styling three options…</Caption>
          </Card>
        )}

        {picked && (
          <Card style={{ borderColor: t.ok }}>
            <Caption>Worn.</Caption>
            <Title>Logged it.</Title>
            <Caption>It rests for a couple of days so you don&apos;t repeat it.</Caption>
          </Card>
        )}

        {!loading && !today && (
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

        {today?.outfits.map((outfit, i) => (
          <Card key={outfit.garmentIds.join("+")} style={{ gap: space.m }}>
            <View style={s.rowBetween}>
              <Caption>Option {i + 1}</Caption>
              <OutfitBadge score={outfit.score} best={bestScore} />
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
        ))}

        {today && today.outfits.length > 0 && (
          <Pressable onPress={() => setSeed((x) => x + 1)} style={s.notToday}>
            <Caption>None of these? Shuffle the 3 options.</Caption>
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
