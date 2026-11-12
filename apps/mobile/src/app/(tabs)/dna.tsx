import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import type { PreferenceVector } from "@styleme/schema";
import { emptyPreference } from "@styleme/schema";
import { colors, paletteSwatch, space } from "@styleme/design";
import { Btn, Caption, Card, Screen, Scroll, Title } from "@/components/ui";
import { loadPrefs, savePrefs } from "@/lib/local";
import { listGarments, metaSet, upsertGarment } from "@/lib/db";
import { getVisionTagger } from "@/lib/vision";

function Bars({ data, swatches }: { data: Record<string, number>; swatches?: boolean }) {
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
              <View style={[s.dot, { backgroundColor: paletteSwatch[k] ?? colors.inkFaint }]} />
            )}
            <Caption>{k}</Caption>
          </View>
          <View style={s.track}>
            <View
              style={[
                s.fill,
                { width: `${Math.round(((v + 1) / 2) * 100)}%`, backgroundColor: v >= 0 ? colors.accent : colors.inkFaint },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DNA() {
  const [prefs, setPrefs] = useState<PreferenceVector>(emptyPreference());
  const [retagging, setRetagging] = useState(false);
  const [retagProgress, setRetagProgress] = useState("");

  useFocusEffect(
    useCallback(() => {
      void loadPrefs().then(setPrefs);
    }, []),
  );

  async function retagAll() {
    setRetagging(true);
    try {
      const garments = await listGarments();
      const tagger = getVisionTagger();
      let done = 0;
      for (const g of garments) {
        done++;
        setRetagProgress(`${done}/${garments.length}`);
        if (!g.photoRef) continue;
        try {
          const attrs = await tagger.tag(g.photoRef);
          await upsertGarment({ ...g, attrs });
        } catch {
          // keep the old tags for this item
        }
      }
      setRetagProgress("done");
    } finally {
      setRetagging(false);
    }
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
        <Title>Style DNA</Title>
        <Caption>
          Learned from {prefs.n} pick{prefs.n === 1 ? "" : "s"}. Transparent and resettable.
        </Caption>

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
          label={retagging ? `Re-scanning ${retagProgress}…` : "Re-scan wardrobe tags"}
          variant="ghost"
          onPress={() => void retagAll()}
          loading={retagging}
        />
        <Caption>Applies the latest on-device model to clothes you already added.</Caption>

        <Btn label="Reset what I've learned" variant="danger" onPress={() => void reset()} />
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.s },
  dot: { width: 12, height: 12, borderRadius: 6 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});
