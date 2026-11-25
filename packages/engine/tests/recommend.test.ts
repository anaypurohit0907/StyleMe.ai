import { describe, expect, it } from "vitest";
import { emptyPreference } from "@styleme/schema";
import type { Garment } from "@styleme/schema";
import {
  blendWeights,
  colorHarmony,
  DEFAULT_WEIGHTS,
  recommend,
  type EngineWeights,
} from "../src";
import { makeContext, makeWardrobe } from "./helpers";

function find(garments: Garment[], id: string): Garment {
  const g = garments.find((x) => x.id === id);
  if (!g) throw new Error(`missing ${id}`);
  return g;
}

describe("recommend() invariants", () => {
  const wardrobe = makeWardrobe({ seed: 42 });
  const context = makeContext({ occasion: "office", tempC: 16 });

  it("returns at least 3 complete outfits for a normal wardrobe", () => {
    const res = recommend({
      userId: "u1",
      wardrobe,
      context,
      prefs: emptyPreference(),
    });
    expect(res.outfits.length).toBeGreaterThanOrEqual(3);
    expect(res.outfits.length).toBeLessThanOrEqual(3);
    const byId = new Map(wardrobe.map((g) => [g.id, g]));
    for (const o of res.outfits) {
      const items = o.garmentIds.map((id) => find(wardrobe, id));
      const slots = new Set(items.map((g) => g.attrs.slot));
      expect(slots.has("shoes")).toBe(true);
      const bodyOk = slots.has("dress") || (slots.has("top") && slots.has("bottom"));
      expect(bodyOk).toBe(true);
      // no duplicates within an outfit
      expect(new Set(o.garmentIds).size).toBe(o.garmentIds.length);
    }
  });

  it("still returns 3 options when signature dedupe collapses the list", () => {
    const neutral = makeWardrobe({ seed: 7, neutralsOnly: true });
    const res = recommend({
      userId: "u-neutral",
      wardrobe: neutral,
      context,
      prefs: emptyPreference(),
      topK: 3,
    });
    expect(res.outfits.length).toBe(3);
  });

  it("varies garments across the 3 options", () => {
    const res = recommend({
      userId: "u-diverse",
      wardrobe,
      context,
      prefs: emptyPreference(),
      topK: 3,
    });
    const byId = new Map(wardrobe.map((g) => [g.id, g]));
    const tops = res.outfits.map((o) =>
      o.garmentIds.find((id) => byId.get(id)?.attrs.slot === "top"),
    );
    expect(new Set(tops).size).toBeGreaterThanOrEqual(2);
  });

  it("prefers gym subtypes (t-shirt/shorts/sneakers) over a button-down", () => {
    const make = (id: string, slot: Garment["attrs"]["slot"], subtype: string) => ({
      id,
      attrs: {
        slot,
        colors: ["white"] as const,
        pattern: "solid" as const,
        fit: "regular" as const,
        formality: 2,
        season: "all" as const,
        material: "light" as const,
        subtype,
      },
      status: "available" as const,
      photoRef: "",
      addedAt: 1,
      lastWornAt: null,
      corrections: [],
    });
    const gymWardrobe: Garment[] = [
      make("tee", "top", "t-shirt"),
      make("shirt", "top", "button-down shirt"),
      make("shorts", "bottom", "shorts"),
      make("sneakers", "shoes", "sneakers"),
    ];
    const res = recommend({
      userId: "u-gym",
      wardrobe: gymWardrobe,
      context: makeContext({ occasion: "gym", tempC: 22 }),
      prefs: emptyPreference(),
      topK: 3,
    });
    expect(res.outfits[0]?.garmentIds).toContain("tee");
    expect(res.outfits[0]?.garmentIds).not.toContain("shirt");
  });

  it("falls back to all seasons instead of returning zero outfits", () => {
    const make = (id: string, slot: Garment["attrs"]["slot"]) => ({
      id,
      attrs: {
        slot,
        colors: ["white"] as const,
        pattern: "solid" as const,
        fit: "regular" as const,
        formality: 2,
        season: "cool" as const,
        material: "medium" as const,
      },
      status: "available" as const,
      photoRef: "",
      addedAt: 1,
      lastWornAt: null,
      corrections: [],
    });
    const res = recommend({
      userId: "u-hot",
      wardrobe: [make("t", "top"), make("b", "bottom"), make("s", "shoes")],
      context: makeContext({ occasion: "casual", tempC: 30 }),
      prefs: emptyPreference(),
    });
    expect(res.outfits.length).toBeGreaterThanOrEqual(1);
    expect(res.meta.seasonFallback).toBe(true);
  });

  it("NEVER suggests items in the wash (hard filter)", () => {
    const washed: Garment[] = wardrobe.map((g, i) =>
      i < 12 ? { ...g, status: "in_wash" as const } : g,
    );
    const res = recommend({ userId: "u2", wardrobe: washed, context, prefs: emptyPreference() });
    const washIds = new Set(washed.filter((g) => g.status === "in_wash").map((g) => g.id));
    for (const o of res.outfits) {
      for (const id of o.garmentIds) {
        expect(washIds.has(id)).toBe(false);
      }
    }
    expect(res.meta.droppedByStatus).toBeGreaterThanOrEqual(12);
  });

  it("respects personal never-mix as a hard rule", () => {
    const prefs = { ...emptyPreference(), neverMix: [["red", "green"] as [string, string]] };
    const res = recommend({
      userId: "u3",
      wardrobe,
      context: makeContext({ tempC: 22 }),
      prefs,
    });
    const byId = new Map(wardrobe.map((g) => [g.id, g]));
    for (const o of res.outfits) {
      const colors = o.garmentIds.flatMap((id) => byId.get(id)!.attrs.colors);
      const hasRed = colors.includes("red");
      const hasGreen = colors.includes("green");
      // -Infinity outfits are dropped entirely; if wardrobe can't satisfy,
      // result may be empty rather than violating.
      expect(hasRed && hasGreen).toBe(false);
    }
  });

  it("is deterministic for identical inputs", () => {
    const a = recommend({ userId: "u4", wardrobe, context, prefs: emptyPreference() });
    const b = recommend({ userId: "u4", wardrobe, context, prefs: emptyPreference() });
    expect(a.outfits.map((o) => o.garmentIds.join("+"))).toEqual(
      b.outfits.map((o) => o.garmentIds.join("+")),
    );
  });

  it("deterministic per (user, day) but different users diverge", () => {
    const a = recommend({ userId: "alice", wardrobe, context, prefs: emptyPreference() });
    const b = recommend({ userId: "bob", wardrobe, context, prefs: emptyPreference() });
    // same day+user → stable; different user → at least sometimes different
    // top-1 (exploration seed differs). With identical prefs and n=0 the
    // base scores are identical, so allow equality here but require the seed
    // mechanism to be visible in meta.
    expect(a.meta.seed).not.toEqual(b.meta.seed);
    // The seed mechanism must actually move users, not just exist: with
    // learned confidence (n=9 → full exploration strength), kicks are big
    // enough that a spread of users with identical wardrobes must land on
    // more than one distinct top-1.
    const confident = { ...emptyPreference(), n: 9 };
    const top1s = new Set(
      Array.from({ length: 8 }, (_, i) =>
        recommend({ userId: `user-${i}`, wardrobe, context, prefs: confident })
          .outfits[0]!
          .garmentIds.join("+"),
      ),
    );
    expect(top1s.size).toBeGreaterThanOrEqual(2);
  });

  it("attaches outerwear in cold weather", () => {
    const cold = makeContext({ occasion: "errands", tempC: 3, isRaining: true });
    const res = recommend({ userId: "u5", wardrobe, context: cold, prefs: emptyPreference() });
    const byId = new Map(wardrobe.map((g) => [g.id, g]));
    const withOuter = res.outfits.filter((o) =>
      o.garmentIds.some((id) => byId.get(id)!.attrs.slot === "outerwear"),
    );
    // outerwear exists in wardrobe and it's 3C+rain: majority of picks should carry it
    expect(withOuter.length).toBeGreaterThan(0);
  });

  it("engine-attached coat is shared, not taxed: cold-weather options keep distinct cores", () => {
    // Audit F-coat: the fixed best coat used to be bolted onto every
    // candidate AND taxed 0.35 per option by the reuse greedy — attached
    // pieces are now exempt, so variety is spent where the user chose it.
    // (Dress-led options have no "top", so variety is asserted on distinct
    // core garment sets, not on the top slot alone.)
    const cold = makeContext({ occasion: "casual", tempC: 3, isRaining: false });
    const res = recommend({ userId: "u-coat", wardrobe, context: cold, prefs: emptyPreference() });
    const byId = new Map(wardrobe.map((g) => [g.id, g]));
    const withOuter = res.outfits.filter((o) =>
      o.garmentIds.some((id) => byId.get(id)!.attrs.slot === "outerwear"),
    );
    expect(withOuter.length).toBe(res.outfits.length); // everyone wears a coat
    const attached = new Set(["outerwear", "accessory"]);
    const coreSets = new Set(
      res.outfits.map((o) =>
        o.garmentIds.filter((id) => !attached.has(byId.get(id)!.attrs.slot)).join("+"),
      ),
    );
    expect(coreSets.size).toBeGreaterThanOrEqual(2); // not the same outfit thrice
  });

  it("never repeats a garment twice inside one outfit", () => {
    const res = recommend({ userId: "u6", wardrobe, context, prefs: emptyPreference() });
    for (const o of res.outfits) {
      expect(new Set(o.garmentIds).size).toBe(o.garmentIds.length);
    }
  });

  it("penalizes recently worn pieces (rotation)", () => {
    const now = context.now;
    const fresh = recommend({
      userId: "u7",
      wardrobe,
      context,
      prefs: emptyPreference(),
    });
    const top1 = fresh.outfits[0]!;
    // mark every garment in top-1 as worn 1 hour ago
    const wornIds = new Set(top1.garmentIds);
    const stale: Garment[] = wardrobe.map((g) =>
      wornIds.has(g.id) ? { ...g, lastWornAt: now - 3600_000 } : g,
    );
    const after = recommend({
      userId: "u7",
      wardrobe: stale,
      context,
      prefs: emptyPreference(),
    });
    const top1After = after.outfits[0]!;
    const overlap = top1After.garmentIds.filter((id) => wornIds.has(id)).length;
    // rotation should push the engine away from the identical outfit
    expect(overlap).toBeLessThan(top1.garmentIds.length);
  });

  it("reports missing slots so the app can prompt intake", () => {
    const noShoes = makeWardrobe({
      seed: 7,
      slotPlan: { top: 4, bottom: 3, dress: 0, shoes: 0, outerwear: 0, accessory: 0 },
    });
    const res = recommend({
      userId: "u8",
      wardrobe: noShoes,
      context,
      prefs: emptyPreference(),
    });
    expect(res.outfits.length).toBe(0);
    expect(res.meta.missingSlots).toContain("shoes");
  });

  it("reasons are non-empty and tone-agnostic (no slang)", () => {
    const res = recommend({ userId: "u9", wardrobe, context, prefs: emptyPreference() });
    for (const o of res.outfits) {
      expect(o.reasons.length).toBeGreaterThan(0);
      const text = o.reasons.map((r) => r.text).join(" ");
      expect(text.toLowerCase()).not.toMatch(/(no cap|bestie|slay|it's giving)/);
    }
  });

  it("every reason reads like a human sentence", () => {
    const res = recommend({ userId: "u9-copy", wardrobe, context, prefs: emptyPreference() });
    for (const o of res.outfits) {
      for (const r of o.reasons) {
        // sentence-cased, one sentence, machine-free
        expect(r.text).toMatch(/^[A-Z]/);
        expect(r.text.endsWith(".")).toBe(true);
        expect(r.text).not.toContain("·");
        expect(r.text.toLowerCase()).not.toContain("rotation ok");
      }
    }
  });

  it("surfaces skipped never-mix pairs in meta instead of dropping them silently", () => {    const make = (id: string, slot: Garment["attrs"]["slot"], colors: string[]) => ({
      id,
      attrs: {
        slot,
        colors: colors as Garment["attrs"]["colors"],
        pattern: "solid" as const,
        fit: "regular" as const,
        formality: 2,
        season: "all" as const,
        material: "light" as const,
      },
      status: "available" as const,
      photoRef: "",
      addedAt: 1,
      lastWornAt: null,
      corrections: [],
    });
    const wardrobe: Garment[] = [
      make("red-top", "top", ["red"]),
      make("green-bottom", "bottom", ["green"]),
      make("blue-top", "top", ["blue"]),
      make("navy-bottom", "bottom", ["navy"]),
      make("shoes", "shoes", ["white"]),
    ];
    const prefs = {
      ...emptyPreference(),
      neverMix: [{ colorA: "red", colorB: "green" }],
    };
    const res = recommend({
      userId: "u-skip",
      wardrobe,
      context: makeContext({ occasion: "casual", tempC: 22 }),
      prefs,
    });
    // the red+green candidate was considered and filtered, not silently lost
    expect(res.meta.skippedNeverMix).toContainEqual(["red", "green"]);
    // and the surviving outfits honor the rule: never red and green together
    for (const o of res.outfits) {
      const both = o.garmentIds.includes("red-top") && o.garmentIds.includes("green-bottom");
      expect(both).toBe(false);
    }
  });

  it("empty wardrobe: zero outfits, honest meta, no crash", () => {
    const res = recommend({
      userId: "u-empty",
      wardrobe: [],
      context,
      prefs: emptyPreference(),
    });
    expect(res.outfits).toEqual([]);
    expect(res.meta.considered).toBe(0);
    expect(res.meta.missingSlots).toContain("shoes");
    expect(res.meta.missingSlots).toContain("top + bottom (or a dress)");
    expect(res.meta.unavailableSlots).toEqual([]);
  });

  it("owned-but-all-in-wash slots are reported separately from missing slots", () => {
    const make = (id: string, slot: Garment["attrs"]["slot"], status: Garment["status"]) => ({
      id,
      attrs: {
        slot,
        colors: ["white"] as const,
        pattern: "solid" as const,
        fit: "regular" as const,
        formality: 2,
        season: "all" as const,
        material: "light" as const,
      },
      status,
      photoRef: "",
      addedAt: 1,
      lastWornAt: null,
      corrections: [],
    });
    const res = recommend({
      userId: "u-wash",
      wardrobe: [
        make("t", "top", "available"),
        make("b", "bottom", "available"),
        make("s1", "shoes", "in_wash"),
        make("s2", "shoes", "in_wash"),
      ],
      context,
      prefs: emptyPreference(),
    });
    // shoes exist but nothing wearable → no complete outfit can form
    expect(res.outfits).toEqual([]);
    expect(res.meta.missingSlots).toEqual([]); // user OWNS shoes — don't say "add shoes"
    expect(res.meta.unavailableSlots).toEqual(["shoes"]); // say "all in the wash" instead
  });

  it("dress + shoes outfits are 2 garments — the schema min must allow this (T-020 min(2))", () => {
    const dressWardrobe = makeWardrobe({
      seed: 9,
      slotPlan: { dress: 3, shoes: 3 },
    });
    const warm = makeContext({ occasion: "casual", tempC: 24 });
    const res = recommend({
      userId: "u-dress",
      wardrobe: dressWardrobe,
      context: warm,
      prefs: emptyPreference(),
    });
    expect(res.outfits.length).toBeGreaterThan(0);
    for (const o of res.outfits) {
      expect(o.garmentIds.length).toBe(2);
    }
  });

  it("never-mix hard filter carries its personal reason and the violating pair", () => {
    const res = colorHarmony(
      ["red", "green"],
      { red: 1, green: 1 },
      [["red", "green"]],
    );
    expect(res.score).toBe(-Infinity);
    expect(res.text).toBe("You asked us to never mix red and green.");
    expect(res.neverMixViolation).toEqual(["red", "green"]);
  });

  it("blendWeights mixes hand-encoded and learned weights", () => {
    const hand = DEFAULT_WEIGHTS;
    const learned = { color: 0.5, formality: 1 } as Partial<EngineWeights>;
    // mix 0 → hand weights unchanged
    expect(blendWeights(hand, learned, 0)).toEqual(hand);
    // mix 1 → learned keys replace, missing keys keep hand values
    const full = blendWeights(hand, learned, 1);
    expect(full.color).toBe(0.5);
    expect(full.formality).toBe(1);
    expect(full.silhouette).toBe(hand.silhouette);
    // mix 0.5 → midpoint on learned keys only
    const mid = blendWeights(hand, learned, 0.5);
    expect(mid.color).toBeCloseTo((hand.color + 0.5) / 2);
    expect(mid.silhouette).toBe(hand.silhouette);
    // empty learned → hand weights for any mix
    expect(blendWeights(hand, {}, 0.7)).toEqual(hand);
  });

  it("attaches at most one harmony-safe accessory per outfit", () => {
    const make = (
      id: string,
      slot: Garment["attrs"]["slot"],
      colors: string[],
      formality = 2,
    ) => ({
      id,
      attrs: {
        slot,
        colors: colors as Garment["attrs"]["colors"],
        pattern: "solid" as const,
        fit: "regular" as const,
        formality,
        season: "all" as const,
        material: "light" as const,
      },
      status: "available" as const,
      photoRef: "",
      addedAt: 1,
      lastWornAt: null,
      corrections: [],
    });
    const res = recommend({
      userId: "u-acc",
      wardrobe: [
        make("t1", "top", ["white"]),
        make("t2", "top", ["navy"]),
        make("b1", "bottom", ["grey"]),
        make("b2", "bottom", ["black"]),
        make("s1", "shoes", ["white"]),
        make("s2", "shoes", ["black"]),
        make("a1", "accessory", ["brown"]), // neutral → safe to attach
        make("a2", "accessory", ["pink"]), // chromatic, pink unworn → never attached
      ],
      context: makeContext({ occasion: "casual", tempC: 22 }),
      prefs: emptyPreference(),
    });
    const byId = new Map<string, Garment>();
    let attached = 0;
    for (const o of res.outfits) {
      const accs = o.garmentIds.filter((id) => id.startsWith("a"));
      expect(accs.length).toBeLessThanOrEqual(1);
      for (const id of accs) {
        attached++;
        expect(id).toBe("a1"); // a2 can't introduce an unworn chromatic color
      }
    }
    expect(attached).toBeGreaterThan(0);
  });
});
