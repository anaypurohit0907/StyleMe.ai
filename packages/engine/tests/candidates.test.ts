import { describe, expect, it } from "vitest";
import { generateCandidates, acceptableSeasons } from "../src/candidates";
import { makeWardrobe } from "./helpers";

describe("generateCandidates", () => {
  it("only produces complete base shapes (top+bottom+shoes or dress+shoes)", () => {
    const wardrobe = makeWardrobe({ seed: 1 });
    const { candidates } = generateCandidates(wardrobe, { tempC: 20, isRaining: false });
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      const slots = c.items.map((g) => g.attrs.slot);
      const hasDress = slots.includes("dress");
      const hasPair = slots.includes("top") && slots.includes("bottom");
      expect(hasDress || hasPair).toBe(true);
      expect(slots).toContain("shoes");
    }
  });

  it("excludes retired / in_wash / in_use items from candidates", () => {
    const wardrobe = makeWardrobe({ seed: 2 }).map((g, i) => {
      if (i % 3 === 0) return { ...g, status: "in_wash" as const };
      if (i % 7 === 0) return { ...g, status: "retired" as const };
      return g;
    });
    const { candidates, stats } = generateCandidates(wardrobe, { tempC: 20, isRaining: false });
    expect(stats.droppedByStatus).toBeGreaterThan(0);
    for (const c of candidates) {
      for (const g of c.items) {
        expect(g.status).toBe("available");
      }
    }
  });

  it("season filtering follows temperature bands", () => {
    const winter = acceptableSeasons({ tempC: 5, isRaining: false });
    expect(winter.has("cool")).toBe(true);
    expect(winter.has("all")).toBe(true);
    expect(winter.has("warm")).toBe(false);
    const summer = acceptableSeasons({ tempC: 30, isRaining: false });
    expect(summer.has("warm")).toBe(true);
    expect(summer.has("cool")).toBe(false);
    expect([...acceptableSeasons({ tempC: 20, isRaining: false })]).toHaveLength(3);

    const wardrobe = makeWardrobe({ seed: 3 });
    const winterGen = generateCandidates(wardrobe, { tempC: 4, isRaining: false });
    expect(winterGen.stats.droppedBySeason).toBeGreaterThan(0);
    for (const c of winterGen.candidates) {
      for (const g of c.items) {
        expect(["cool", "all"]).toContain(g.attrs.season);
      }
    }
  });

  it("bounds total candidates (performance cap)", () => {
    // worst case: huge wardrobe, all "all-season"
    const big = makeWardrobe({
      seed: 4,
      slotPlan: { top: 60, bottom: 40, dress: 20, shoes: 25, outerwear: 10, accessory: 10 },
    }).map((g) => ({ ...g, attrs: { ...g.attrs, season: "all" as const } }));
    const { candidates } = generateCandidates(big, { tempC: 20, isRaining: false });
    expect(candidates.length).toBeLessThanOrEqual(400);
  });
});
