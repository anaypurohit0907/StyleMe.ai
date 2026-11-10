import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Garment, Occasion, ScoredOutfit } from "@styleme/schema";
import { colors, occasionLabel, occasions, paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Empty, Screen, Scroll, Title } from "@/components/ui";
import { listGarments, logWear, upsertGarment } from "@/lib/db";
import { getWeather, recommendLocal, recordPick, type LocalToday, type Weather } from "@/lib/local";

export default function Today() {
  const router = useRouter();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [available, setAvailable] = useState<Garment[]>([]);
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [weather, setWeather] = useState<Weather>({ tempC: 18, isRaining: false });
  const [today, setToday] = useState<LocalToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<ScoredOutfit | null>(null);
  const [seed, setSeed] = useState(0);

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
      if (free.length >= 3) {
        const result = await recommendLocal(free, occasion, w, seed);
        setToday(result.outfits.length > 0 ? result : null);
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

  async function pick(outfit: ScoredOutfit) {
    if (!today) return;
    await recordPick(available, outfit, today.outfits, today.context);
    await logWear(outfit.garmentIds, occasion, Date.now());
    setPicked(outfit);
  }

  const byId = new Map(garments.map((g) => [g.id, g]));
  const owned = new Set(available.map((g) => g.attrs.slot));
  const missing: string[] = [];
  if (!owned.has("shoes")) missing.push("shoes");
  if (!((owned.has("top") && owned.has("bottom")) || owned.has("dress"))) {
    missing.push("a top + bottom (or a dress)");
  }

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
            <Title>Today</Title>
            <Caption>
              {Math.round(weather.tempC)}°{weather.isRaining ? " · rain" : ""} ·{" "}
              {available.length} pieces ready
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

        {picked && (
          <Card style={{ borderColor: colors.ok }}>
            <Caption>Worn.</Caption>
            <Title>Logged it.</Title>
            <Caption>It rests for a couple of days so you don't repeat it.</Caption>
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

        {today?.outfits.map((outfit, i) => (
          <Card key={outfit.garmentIds.join("+")} style={{ gap: space.m }}>
            <View style={s.rowBetween}>
              <Caption>Option {i + 1}</Caption>
              <Caption>{outfit.score.toFixed(2)}</Caption>
            </View>
            <View style={s.thumbs}>
              {outfit.garmentIds.map((id) => {
                const g = byId.get(id);
                if (!g) return <View key={id} style={[s.thumb, { backgroundColor: colors.surfaceAlt }]} />;
                return g.photoRef ? (
                  <Image key={id} source={{ uri: g.photoRef }} style={s.thumb} />
                ) : (
                  <View
                    key={id}
                    style={[s.thumb, { backgroundColor: paletteSwatch[g.attrs.colors[0]] ?? colors.surfaceAlt }]}
                  />
                );
              })}
            </View>
            <Caption>
              {outfit.reasons
                .filter((r) => r.score > 0.05)
                .slice(0, 3)
                .map((r) => r.text)
                .join(" · ") || "Complete, coherent, yours."}
            </Caption>
            <Btn
              label={picked?.garmentIds.join("+") === outfit.garmentIds.join("+") ? "Picked" : "Wear this"}
              onPress={() => void pick(outfit)}
              disabled={!!picked}
            />
          </Card>
        ))}

        {today && (
          <Pressable onPress={() => setSeed((x) => x + 1)} style={s.notToday}>
            <Caption>None of these? Shuffle the 3 options.</Caption>
          </Pressable>
        )}
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.m },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  thumbs: { flexDirection: "row", gap: space.s },
  thumb: { flex: 1, aspectRatio: 0.8, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  notToday: { alignItems: "center", paddingVertical: space.m },
});
