import { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import type { PreferenceVector } from "@styleme/schema";
import { emptyPreference } from "@styleme/schema";
import { paletteSwatch, space } from "@styleme/design";
import { Btn, Caption, Card, Display, Screen, Scroll, TextLink, Title } from "@/components/ui";
import { ScanLog } from "@/components/scan-log";
import { answerPoll, getPendingPoll, loadPrefs, savePrefs, type Poll } from "@/lib/local";
import { useToneProfile, voice } from "@/lib/tone";
import { applyCorrections } from "@styleme/schema/corrections";
import { listGarments, metaSet, upsertGarment } from "@/lib/db";
import { getVisionTagger } from "@/lib/vision";
import { segmentGarment } from "@/lib/segment";
import { errorText, log, logError, withTimeout } from "@/lib/pipeline-log";
import { useTheme } from "@/lib/theme";

const ITEM_TIMEOUT = 120_000;

function BarFill({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(1, (value + 1) / 2));
  const width = useSharedValue(pct);
  const reduce = useReducedMotion();
  useEffect(() => {
    width.value = reduce ? pct : withTiming(pct, { duration: 320 });
  }, [pct, reduce, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return <Animated.View style={[s.fill, { backgroundColor: color }, style]} />;
}

function Bars({ data, swatches }: { data: Record<string, number>; swatches?: boolean }) {
  const t = useTheme();
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (entries.length === 0) return <Caption>Nothing learned yet. Pick a few outfits.</Caption>;
  return (
    <View style={{ gap: space.s }}>
      {entries.map(([k, v]) => (
        <View key={k} style={s.row}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, width: 110 }}>
            {swatches && (
              <View style={[s.dot, { backgroundColor: paletteSwatch[k] ?? t.inkFaint }]} />
            )}
            <Caption>{k}</Caption>
          </View>
          <View style={[s.track, { backgroundColor: t.surfaceAlt }]}>
            <BarFill value={v} color={v >= 0 ? t.accent : t.inkFaint} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DNA() {
  const t = useTheme();
  const tone = useToneProfile();
  const [prefs, setPrefs] = useState<PreferenceVector>(emptyPreference());
  const [poll, setPoll] = useState<Poll | null>(null);
  const [retagging, setRetagging] = useState(false);
  const [retagProgress, setRetagProgress] = useState("");
  const [retagStage, setRetagStage] = useState("");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const cancelRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([loadPrefs(), getPendingPoll()])
        .then(([next, pending]) => {
          setPrefs(next);
          setPoll(pending);
        })
        .catch(() => {
          // A failed poll query must not hide the learned DNA.
        });
    }, []),
  );

  async function answer(pending: Poll, choice: string) {
    try {
      const next = await answerPoll(pending, choice);
      setPrefs(next);
      setPoll(null);
      void Haptics.selectionAsync();
    } catch {
      // Keep the poll on screen if the local write failed.
    }
  }

  async function retagAll() {
    if (retagging) return;
    cancelRef.current = false;
    setRetagging(true);
    setRetagStage("starting");
    const scanStart = Date.now();
    try {
      log("scan", "re-scan requested");
      const garments = await listGarments();
      log("scan", `loaded ${garments.length} garments`);
      const tagger = getVisionTagger();
      let done = 0;
      for (const g of garments) {
        if (cancelRef.current) {
          log("scan", "cancelled by user");
          break;
        }
        done++;
        const label = `${done}/${garments.length}`;
        setRetagProgress(label);
        setRetagStage("preparing");
        if (!g.photoRef) {
          log("scan", `${label} skip id=${g.id}: no photo`);
          continue;
        }
        const itemStart = Date.now();
        log(
          "scan",
          `${label} start id=${g.id} slot=${g.attrs.slot} source=${g.originalRef ? "original" : "stored"}`,
        );
        try {
          const source = g.originalRef ?? g.photoRef;
          const seg = await withTimeout(
            segmentGarment(source, g.id),
            ITEM_TIMEOUT,
            `cutout ${label}`,
          );
          setRetagStage("tagging");
          const modelAttrs = await withTimeout(
            tagger.tag(seg.cutoutUri),
            ITEM_TIMEOUT,
            `tag ${label}`,
          );
          const attrs = applyCorrections(modelAttrs, g.corrections);
          if (g.corrections.length > 0) {
            log("scan", `${label} re-applied ${g.corrections.length} user correction(s)`);
          }
          setRetagStage("saving");
          await upsertGarment({
            ...g,
            attrs,
            photoRef: seg.cutoutUri,
            originalRef: g.originalRef ?? source,
          });
          log(
            "scan",
            `${label} saved slot=${attrs.slot} subtype=${attrs.subtype ?? "-"} cov=${seg.coverage.toFixed(2)} in ${Date.now() - itemStart}ms`,
          );
        } catch (err) {
          // Keep the old tags for this item, but leave the reason on screen.
          logError("scan", `${label} FAILED after ${Date.now() - itemStart}ms: ${errorText(err)}`);
        }
      }
      setRetagStage("done");
      // Full wardrobe re-tagged — a quiet success tap, skipped if cancelled.
      if (!cancelRef.current) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      log("scan", `finished in ${Date.now() - scanStart}ms`);
    } catch (err) {
      setRetagStage("failed");
      logError("scan", `aborted: ${errorText(err)}`);
    } finally {
      setRetagging(false);
    }
  }

  function cancelRetag() {
    cancelRef.current = true;
    log("scan", "cancel requested");
  }

  async function reset() {
    const fresh = emptyPreference();
    setPrefs(fresh);
    await savePrefs(fresh);
    await metaSet("explore", "{}");
  }

  return (
    <Screen>
      <Scroll>
        <Display>Style DNA</Display>
        <Caption>
          Learned from {prefs.n} pick{prefs.n === 1 ? "" : "s"}. Transparent and resettable.
        </Caption>

        {poll && (
          <Card style={{ gap: space.m, borderColor: t.accent }}>
            <Caption>{voice("poll_invite", tone, `poll-${poll.day}`)}</Caption>
            <Title>{poll.question}</Title>
            <View style={{ flexDirection: "row", gap: space.s }}>
              {poll.options.map((option) => (
                <Btn
                  key={option.key}
                  label={option.label}
                  variant="ghost"
                  onPress={() => void answer(poll, option.key)}
                />
              ))}
            </View>
          </Card>
        )}

        <Card style={{ gap: space.m }}>
          <Caption>Colors you reach for</Caption>
          <Bars data={prefs.colors} swatches />
        </Card>

        <Card style={{ gap: space.m }}>
          <Caption>Fits</Caption>
          <Bars data={prefs.fits} />
        </Card>

        <Card style={{ gap: space.m }}>
          <Caption>Patterns</Caption>
          <Bars data={prefs.patterns} />
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Formality center</Caption>
          <Title>{prefs.formalityCenter.toFixed(1)} / 5</Title>
          <Caption>1 = street, 5 = formal. Drifts with your picks.</Caption>
        </Card>

        <Btn
          label={
            retagging
              ? `Re-scanning ${retagProgress} · ${retagStage}…`
              : "Re-scan wardrobe tags"
          }
          variant="ghost"
          onPress={() => void retagAll()}
          loading={retagging}
        />
        {retagging && <Btn label="Cancel scan" variant="ghost" onPress={cancelRetag} />}
        <Caption>Applies the latest on-device model to clothes you already added.</Caption>
        {retagging && (
          <Caption>
            Working on {retagProgress} · {retagStage}. Each item has a 2-minute timeout, so the scan
            always moves on.
          </Caption>
        )}
        <Btn label="Reset what I've learned" variant="danger" onPress={() => void reset()} />

        {/* Debug chrome is tucked away; the pullable styleme.log is the
            release-test source of truth (docs/TESTING.md). */}
        {diagnosticsOpen ? (
          <>
            <ScanLog limit={40} title="Diagnostics" />
            <TextLink label="Hide diagnostics" onPress={() => setDiagnosticsOpen(false)} />
          </>
        ) : (
          <TextLink label="Diagnostics" onPress={() => setDiagnosticsOpen(true)} />
        )}
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s },
  dot: { width: 12, height: 12, borderRadius: 6 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});
