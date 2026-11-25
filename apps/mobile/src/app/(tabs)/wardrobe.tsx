import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Garment } from "@styleme/schema";
import { paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Chip, Empty, Screen, Scroll, Title } from "@/components/ui";
import { listGarments } from "@/lib/db";
import { useTheme } from "@/lib/theme";

const SLOTS = ["all", "top", "bottom", "dress", "outerwear", "shoes", "accessory"] as const;

export default function Wardrobe() {
  const router = useRouter();
  const t = useTheme();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>("all");

  useFocusEffect(
    useCallback(() => {
      void listGarments().then(setGarments);
    }, []),
  );

  const shown = slot === "all" ? garments : garments.filter((g) => g.attrs.slot === slot);

  return (
    <Screen>
      <Scroll>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Title>Wardrobe</Title>
            <Caption>{garments.length} pieces · {garments.filter((g) => g.status === "in_wash").length} in wash</Caption>
          </View>
          <Btn label="Add" onPress={() => router.push("/(tabs)/capture")} />
        </View>

        <View style={s.chips}>
          {SLOTS.map((s0) => (
            <Chip key={s0} label={s0} selected={slot === s0} onPress={() => setSlot(s0)} />
          ))}
        </View>

        {shown.length === 0 ? (
          <Empty
            title="Nothing here yet."
            body="Photograph a piece and it lands here, tagged and ready."
            action={<Btn label="Add clothes" onPress={() => router.push("/(tabs)/capture")} />}
          />
        ) : (
          <View style={s.grid}>
            {shown.map((g) => (
              <Pressable key={g.id} onPress={() => router.push(`/item/${g.id}`)} style={[s.tile, { backgroundColor: t.surface, borderColor: t.line }]}>
                {g.photoRef ? (
                  <Image source={{ uri: g.photoRef }} style={[s.img, { borderColor: t.line }]} />
                ) : (
                  <View style={[s.img, { borderColor: t.line, backgroundColor: paletteSwatch[g.attrs.colors[0]] ?? t.surfaceAlt }]} />
                )}
                <View style={s.tileBody}>
                  <Caption>
                    {g.attrs.slot} · {g.attrs.colors.join(" / ")}
                  </Caption>
                  {g.status !== "available" && (
                    <Caption>{g.status === "in_wash" ? "in wash" : g.status}</Caption>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.m },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.s },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.m },
  tile: {
    width: "47%",
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  img: { width: "100%", aspectRatio: 0.8, borderWidth: StyleSheet.hairlineWidth },
  tileBody: { padding: space.s, gap: 2 },
});
