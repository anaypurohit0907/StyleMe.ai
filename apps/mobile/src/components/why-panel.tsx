/**
 * The "why" surface — StyleMe's transparency layer.
 *
 * WhyPanel: expandable per-outfit reason list (top 3, human sentences).
 * Long-press a reason to never-mix that outfit's two loudest colors —
 * the rule is appended to prefs.neverMix and the engine hard-filters it.
 * OutfitBadge: qualitative read of the score instead of a raw float.
 * Toast: lightweight undo affordance for the never-mix action.
 */
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorName, Garment, ScoredOutfit } from "@styleme/schema";
import { isNeutral, SLOT_MASS } from "@styleme/engine";
import { colors, radius, space, type as typo } from "@styleme/design";

/**
 * The two colors most worth binding to a never-mix rule in this outfit:
 * the highest-mass chromatic pair, falling back to the two loudest colors
 * overall when the outfit is all-neutral.
 */
export function neverMixPairFor(
  outfit: ScoredOutfit,
  byId: Map<string, Garment>,
): [ColorName, ColorName] | null {
  const mass: Partial<Record<ColorName, number>> = {};
  for (const id of outfit.garmentIds) {
    const g = byId.get(id);
    if (!g) continue;
    const m = SLOT_MASS[g.attrs.slot] ?? 0.5;
    for (const c of g.attrs.colors) mass[c] = Math.max(mass[c] ?? 0, m);
  }
  const all = Object.keys(mass) as ColorName[];
  const chromatic = all.filter((c) => !isNeutral(c));
  const pool = chromatic.length >= 2 ? chromatic : all;
  const ranked = [...pool].sort((a, b) => (mass[b] ?? 0) - (mass[a] ?? 0));
  if (ranked.length < 2) return null;
  const first = ranked[0]!;
  const second = ranked[1]!;
  return [first, second];
}

/** Qualitative badge: "very you" / "safe bet" / "wildcard". */
export function OutfitBadge({ score, best }: { score: number; best: number }) {
  const gap = best - score;
  const label = gap < 0.01 ? "Very you" : gap <= 0.75 ? "Safe bet" : "Wildcard";
  return (
    <View style={[b.badge, label === "Very you" && { backgroundColor: colors.accentSoft }]}>
      <Text style={[b.text, label === "Very you" && { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

export function WhyPanel({
  outfit,
  byId,
  onNeverMix,
}: {
  outfit: ScoredOutfit;
  byId: Map<string, Garment>;
  onNeverMix: (pair: [ColorName, ColorName]) => void;
}) {
  const [open, setOpen] = useState(false);
  const reasons = outfit.reasons
    .filter((r) => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return (
    <View style={{ gap: space.s }}>
      <Pressable
        onPress={() => setOpen((x) => !x)}
        accessibilityLabel={open ? "Hide the reasons" : "Why this outfit"}
        style={({ pressed }) => [p.toggle, pressed && { opacity: 0.6 }]}>
        <Text style={p.toggleText}>{open ? "Hide the why" : "Why this"}</Text>
      </Pressable>
      {open &&
        (reasons.length > 0 ? (
          <View style={{ gap: space.xs }}>
            {reasons.map((r) => (
              <Pressable
                key={r.rule}
                onLongPress={() => {
                  const pair = neverMixPairFor(outfit, byId);
                  if (pair) onNeverMix(pair);
                }}
                accessibilityLabel={`Reason: ${r.text}. Press and hold to ban this outfit's loudest color pair.`}
                style={({ pressed }) => [p.reason, pressed && { opacity: 0.6 }]}>
                <Text style={p.reasonText}>{r.text}</Text>
              </Pressable>
            ))}
            <Text style={p.hint}>Press and hold a reason to ban this outfit&apos;s loudest color pair.</Text>
          </View>
        ) : (
          <Text style={p.reasonText}>Complete, coherent, yours.</Text>
        ))}
    </View>
  );
}

export function Toast({ message, onUndo }: { message: string; onUndo?: () => void }) {
  return (
    <View style={t.wrap}>
      <Text style={t.message}>{message}</Text>
      {onUndo && (
        <Pressable onPress={onUndo} hitSlop={12}>
          <Text style={t.undo}>Undo</Text>
        </Pressable>
      )}
    </View>
  );
}

const b = StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.s,
    paddingVertical: 2,
  },
  text: { ...typo.caption, color: colors.inkSoft },
});

const p = StyleSheet.create({
  toggle: { alignSelf: "flex-start" },
  toggleText: { ...typo.caption, fontWeight: "600", color: colors.accent },
  reason: { alignSelf: "flex-start" },
  reasonText: { ...typo.body, color: colors.ink },
  hint: { ...typo.caption, color: colors.inkFaint },
});

const t = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: space.m,
    right: space.m,
    bottom: space.l,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.m,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.m,
  },
  message: { flex: 1, ...typo.body, color: "#FFFFFF" },
  undo: { ...typo.body, fontWeight: "600", color: colors.accentSoft },
});
