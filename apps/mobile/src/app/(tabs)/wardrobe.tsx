import { useCallback, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useFocusEffect, useRouter } from "expo-router";
import type { Garment, GarmentStatus } from "@styleme/schema";
import { isNeutral } from "@styleme/engine";
import { paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Chip, Empty, Screen, Scroll, TextLink, Title, usePressFeedback, AnimatedPressable } from "@/components/ui";
import { listGarments, setGarmentStatus } from "@/lib/db";
import { enqueueLaundry } from "@/lib/sync-queue";
import { useTheme } from "@/lib/theme";
import { useToneProfile, voice } from "@/lib/tone";

const SLOTS = ["all", "top", "bottom", "dress", "outerwear", "shoes", "accessory"] as const;
const STATUSES: ("all" | GarmentStatus)[] = ["all", "available", "in_wash", "in_use", "retired"];
const COLORS = ["all", "neutral", "color"] as const;
const STATUS_LABEL: Record<"all" | GarmentStatus, string> = {
  all: "all",
  available: "ready",
  in_wash: "in wash",
  in_use: "wearing",
  retired: "retired",
};

/** React purity lint: keep the impure clock call out of the component body. */
const nowMs = () => Date.now();

/** One wardrobe tile: press feedback + staggered entrance, reduce-motion aware. */
function Tile({ g, index }: { g: Garment; index: number }) {
  const router = useRouter();
  const t = useTheme();
  const reduce = useReducedMotion();
  const fb = usePressFeedback();
  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.duration(220).delay(Math.min(index, 8) * 35)}>
      <AnimatedPressable
        onPress={() => router.push(`/item/${g.id}`)}
        onPressIn={fb.onPressIn}
        onPressOut={fb.onPressOut}
        style={[s.tile, { backgroundColor: t.surface, borderColor: t.line }, fb.style]}>
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
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function Wardrobe() {
  const router = useRouter();
  const tone = useToneProfile();
  const t = useTheme();
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [color, setColor] = useState<(typeof COLORS)[number]>("all");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setGarments(await listGarments());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const shown = garments.filter((g) => {
    if (slot !== "all" && g.attrs.slot !== slot) return false;
    if (status !== "all" && g.status !== status) return false;
    if (color === "neutral" && !g.attrs.colors.some((c) => isNeutral(c))) return false;
    if (color === "color" && g.attrs.colors.every((c) => isNeutral(c))) return false;
    return true;
  });
  const washedCount = garments.filter((g) => g.status === "in_wash").length;
  const filtersActive = slot !== "all" || status !== "all" || color !== "all";

  async function allWashed() {
    const ids = garments.filter((g) => g.status === "in_wash").map((g) => g.id);
    if (ids.length === 0) return;
    await setGarmentStatus(ids, "available");
    // The worker caps LaundryEvent.garmentIds at 100 (T-037) — chunk so a
    // big wardrobe can't enqueue an event the worker always 400s on.
    const LAUNDRY_CHUNK = 100;
    for (let i = 0; i < ids.length; i += LAUNDRY_CHUNK) {
      await enqueueLaundry({
        garmentIds: ids.slice(i, i + LAUNDRY_CHUNK),
        event: "washed",
        expectedAvailableAt: null,
        ts: nowMs(),
      });
    }
    await reload();
  }

  function clearFilters() {
    setSlot("all");
    setStatus("all");
    setColor("all");
  }

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
        <TextLink label="What to add next" onPress={() => router.push("/gap")} />

        <View style={s.chips}>
          {SLOTS.map((s0) => (
            <Chip key={s0} label={s0} selected={slot === s0} onPress={() => setSlot(s0)} />
          ))}
        </View>
        <View style={s.chips}>
          {STATUSES.map((s0) => (
            <Chip
              key={s0}
              label={STATUS_LABEL[s0]}
              selected={status === s0}
              onPress={() => setStatus(s0)}
            />
          ))}
        </View>
        <View style={s.chips}>
          {COLORS.map((c) => (
            <Chip
              key={c}
              label={c === "all" ? "all colors" : c}
              selected={color === c}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {washedCount > 0 && (
          <Btn label={`All washed (${washedCount})`} variant="ghost" onPress={() => void allWashed()} />
        )}

        {loading ? (
          <View style={s.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.tile, { backgroundColor: t.surface, borderColor: t.line }]}>
                <View style={[s.img, { backgroundColor: t.surfaceAlt }]} />
                <View style={s.tileBody}>
                  <Caption> </Caption>
                </View>
              </View>
            ))}
          </View>
        ) : garments.length === 0 ? (
          <Empty
            title={voice("wardrobe_empty", tone)}
            body="Photograph a piece and it lands here, tagged and ready."
            action={
              <View style={{ gap: space.s, alignSelf: "stretch" }}>
                <Btn label="Add clothes" onPress={() => router.push("/(tabs)/capture")} />
                <TextLink label="What to add next" onPress={() => router.push("/gap")} />
              </View>
            }
          />
        ) : shown.length === 0 ? (
          <Empty
            title="Nothing matches those filters."
            body={filtersActive ? "Try a different slot, status, or color." : "Nothing here yet."}
            action={
              <View style={{ gap: space.s, alignSelf: "stretch" }}>
                <Btn label="Clear filters" variant="ghost" onPress={clearFilters} />
                <TextLink label="What to add next" onPress={() => router.push("/gap")} />
              </View>
            }
          />
        ) : (
          <View style={s.grid}>
            {shown.map((g, i) => (
              <Tile key={g.id} g={g} index={i} />
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
