import { useCallback, useState } from "react";
import { Image, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import type { Fit, Garment, GarmentAttrs, GarmentStatus, Pattern, Slot } from "@styleme/schema";
import { paletteSwatch, radius, space } from "@styleme/design";
import { Body, Btn, Caption, Card, Chip, Confirm, Screen, Scroll, Swatch, Title } from "@/components/ui";
import {
  deleteGarment,
  getGarment,
  listWearHistory,
  setGarmentStatus,
  upsertGarment,
  type WearEntry,
} from "@/lib/db";
import { diffCorrections } from "@styleme/schema/corrections";
import { useTheme } from "@/lib/theme";
import { enqueueLaundry } from "@/lib/sync-queue";

/** React purity lint: keep the impure clock call out of the component body. */
const nowMs = () => Date.now();

const SLOTS: Slot[] = ["top", "bottom", "dress", "outerwear", "shoes", "accessory"];
const PATTERNS: Pattern[] = ["solid", "striped", "check", "floral", "graphic", "animal", "other"];
const FITS: Fit[] = ["slim", "regular", "relaxed", "oversized"];
const COLOR_NAMES = Object.keys(paletteSwatch);

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const [g, setG] = useState<Garment | null>(null);
  const [draft, setDraft] = useState<GarmentAttrs | null>(null);
  const [wear, setWear] = useState<WearEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const item = await getGarment(id);
    setG(item);
    setDraft(item ? { ...item.attrs } : null);
    setWear(await listWearHistory(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function setStatus(status: GarmentStatus, laundry?: "in_wash" | "washed") {
    if (!id) return;
    await setGarmentStatus([id], status);
    if (laundry) {
      await enqueueLaundry({
        garmentIds: [id],
        event: laundry,
        expectedAvailableAt: null,
        ts: nowMs(),
      });
    }
    await load();
  }

  async function remove() {
    if (!id) return;
    setConfirmingDelete(false);
    await deleteGarment(id);
    router.back();
  }

  async function saveTags() {
    if (!g || !draft) return;
    setSaving(true);
    const corrections = [...g.corrections, ...diffCorrections(g.attrs, draft)];
    await upsertGarment({ ...g, attrs: draft, corrections });
    setG({ ...g, attrs: draft, corrections });
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
          <View style={[s.img, { backgroundColor: paletteSwatch[draft.colors[0]] ?? t.surfaceAlt }]} />
        )}

        <Card style={{ gap: space.s }}>
          <Caption>Status</Caption>
          <Title>{g.status.replace("_", " ")}</Title>
          {g.lastWornAt && <Caption>Last worn {new Date(g.lastWornAt).toLocaleDateString()}</Caption>}
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Name</Caption>
          <TextInput
            value={draft.nickname ?? ""}
            onChangeText={(v) => patch({ nickname: v.slice(0, 64) })}
            placeholder="Give it a name — optional"
            placeholderTextColor={t.inkFaint}
            style={[s.input, { backgroundColor: t.surface, borderColor: t.line, color: t.ink }]}
          />
        </Card>

        <Card style={{ gap: space.s }}>
          <Caption>Wear history</Caption>
          {wear.length === 0 ? (
            <Caption>No wears logged yet.</Caption>
          ) : (
            wear.map((w) => (
              <View key={`${w.wornAt}-${w.occasion ?? "none"}`} style={s.rowBetween}>
                <Body>{new Date(w.wornAt).toLocaleDateString()}</Body>
                <Caption>{w.occasion ?? "—"}</Caption>
              </View>
            ))
          )}
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
          <Btn
            label="I washed it — back in rotation"
            onPress={() => void setStatus("available", "washed")}
          />
        ) : g.status === "in_use" ? (
          <Btn label="Back in the closet" onPress={() => void setStatus("available")} />
        ) : (
          <>
            <Btn label="Wearing it today" variant="ghost" onPress={() => void setStatus("in_use")} />
            <Btn
              label="Send to laundry"
              variant="ghost"
              onPress={() => void setStatus("in_wash", "in_wash")}
            />
          </>
        )}
        <Btn label="Delete piece" variant="danger" onPress={() => setConfirmingDelete(true)} />
        <Btn label="Back" variant="ghost" onPress={() => router.back()} />
      </Scroll>
      <Confirm
        visible={confirmingDelete}
        title="Delete this piece?"
        body="It disappears from your wardrobe and recommendations. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  img: { width: "100%", aspectRatio: 0.8, borderRadius: radius.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.s, alignItems: "center" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    fontSize: 16,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
