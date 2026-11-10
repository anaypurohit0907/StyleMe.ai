import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Garment, Occasion, ScoredOutfit } from "@styleme/schema";
import { colors, occasionLabel, occasions, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Empty, Screen, Scroll, Title } from "@/components/ui";
import { listGarments, logWear } from "@/lib/db";
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
    const all = await listGarments();
    const free = all.filter((g) => g.status === "available");
    setGarments(all);
    setAvailable(free);
    const w = await getWeather();
    setWeather(w);
    if (free.length >= 2) {
      setToday(await recommendLocal(free, occasion, w, seed));
    } else {
      setToday(null);
    }
    setLoading(false);
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
                : "Add at least a top + bottom (or a dress) and shoes to get 3 outfits."
            }
            action={<Btn label="Add clothes" onPress={() => router.push("/(tabs)/capture")} />}
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
                return g ? (
                  <Image key={id} source={{ uri: g.photoRef }} style={s.thumb} />
                ) : (
                  <View key={id} style={[s.thumb, { backgroundColor: colors.surfaceAlt }]} />
                );
              })}
            </View>
            <Caption>
              {outfit.reasons.find((r) => r.score > 0)?.text ?? "Complete, coherent, yours."}
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
  thumb: { flex: 1, aspectRatio: 0.8, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  notToday: { alignItems: "center", paddingVertical: space.m },
});
