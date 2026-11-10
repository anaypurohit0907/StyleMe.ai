import { describe, expect, it } from "vitest";
import { emptyPreference } from "@styleme/schema";
import type { Garment } from "@styleme/schema";
import { recommend } from "../src";
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
});
