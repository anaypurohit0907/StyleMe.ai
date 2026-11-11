import { useCallback, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { Fit, Garment, GarmentAttrs, Pattern, Slot } from "@styleme/schema";
import { colors, paletteSwatch, radius, space } from "@styleme/design";
import { Btn, Caption, Card, Chip, Screen, Scroll, Swatch, Title } from "@/components/ui";
import { deleteGarment, getGarment, setGarmentStatus, upsertGarment } from "@/lib/db";

const SLOTS: Slot[] = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"];
const PATTERNS: Pattern[] = ["solid", "striped", "check", "floral", "graphic", "animal", "other"];
const FITS: Fit[] = ["slim", "regular", "relaxed", "oversized"];
const COLOR_NAMES = Object.keys(paletteSwatch);

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [g, setG] = useState<Garment | null>(null);
  const [draft, setDraft] = useState<GarmentAttrs | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const item = await getGarment(id);
    setG(item);
    setDraft(item ? { ...item.attrs } : null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function setStatus(status: "available" | "in_wash") {
    if (!id) return;
    await setGarmentStatus([id], status);
    await load();
  }

  async function remove() {
    if (!id) return;
    await deleteGarment(id);
    router.back();
  }

  async function saveTags() {
    if (!g || !draft) return;
    setSaving(true);
    await upsertGarment({ ...g, attrs: draft });
    setG({ ...g, attrs: draft });
    setSaving(false);
    router.back();
  }

  function patch(p: Partial<GarmentAttrs>) {
    setDraft((cur) => (cur ? { ...cur, ...p } : cur));
  }

  function toggleColor(c: string) {
    setDraft((cur) => {
      if (!cur) return cur;
      const has = cur.colors.includes(c as never);
      const next = has ? cur.colors.filter((x) => x !== c) : [...cur.colors, c].slice(-2);
      return { ...cur, colors: next as GarmentAttrs["colors"] };
    });
  }

  if (!g || !draft) {
    return (
      <Screen>
        <Scroll>
          <Title>Not found.</Title>
          <Btn label="Back" variant="ghost" onPress={() => router.back()} />
        </Scroll>
      </Screen>
    );
  }

  return (
    <Screen>
      <Scroll>
        <Title>{draft.slot}</Title>
        <Caption>
          {draft.colors.join(" / ")} · {draft.pattern} · {draft.fit} · formality {draft.formality}/5
          {draft.subtype ? ` · ${draft.subtype}` : ""}
        </Caption>
        {g.photoRef ? (
          <Image source={{ uri: g.photoRef }} style={s.img} />
        ) : (
          <View style={[s.img, { backgroundColor: paletteSwatch[draft.colors[0]] ?? colors.surfaceAlt }]} />
        )}

        <Card style={{ gap: space.s }}>
          <Caption>Status</Caption>
          <Title>{g.status.replace("_", " ")}</Title>
          {g.lastWornAt && <Caption>Last worn {new Date(g.lastWornAt).toLocaleDateString()}</Caption>}
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Slot</Caption>
          <View style={s.wrap}>
            {SLOTS.map((v) => (
              <Chip key={v} label={v} selected={draft.slot === v} onPress={() => patch({ slot: v })} />
            ))}
          </View>
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Colors (up to 2)</Caption>
          <View style={s.wrap}>
            {COLOR_NAMES.map((c) => (
              <Swatch
                key={c}
                color={paletteSwatch[c]}
                selected={draft.colors.includes(c as never)}
                onPress={() => toggleColor(c)}
              />
            ))}
          </View>
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Pattern / fit</Caption>
          <View style={s.wrap}>
            {PATTERNS.map((v) => (
              <Chip key={v} label={v} selected={draft.pattern === v} onPress={() => patch({ pattern: v })} />
            ))}
          </View>
          <View style={s.wrap}>
            {FITS.map((v) => (
              <Chip key={v} label={v} selected={draft.fit === v} onPress={() => patch({ fit: v })} />
            ))}
          </View>
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Formality</Caption>
          <View style={s.wrap}>
            {[1, 2, 3, 4, 5].map((v) => (
              <Chip
                key={v}
                label={`${v}`}
                selected={draft.formality === v}
                onPress={() => patch({ formality: v as GarmentAttrs["formality"] })}
              />
            ))}
          </View>
        </Card>

        <Btn label="Save tags" onPress={() => void saveTags()} loading={saving} />

        {g.status === "in_wash" ? (
          <Btn label="I washed it — back in rotation" onPress={() => void setStatus("available")} />
        ) : (
          <Btn label="Send to laundry" variant="ghost" onPress={() => void setStatus("in_wash")} />
        )}
        <Btn label="Delete piece" variant="danger" onPress={() => void remove()} />
        <Btn label="Back" variant="ghost" onPress={() => router.back()} />
      </Scroll>
    </Screen>
  );
}

const s = StyleSheet.create({
  img: { width: "100%", aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.s, alignItems: "center" },
});
