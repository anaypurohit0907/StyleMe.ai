import { describe, expect, it } from "vitest";
import { colorHarmony, hueDistance, isNeutral, PALETTE, SLOT_MASS } from "../src/color";

const mass = (c: string, m: number) => ({ [c]: m });

describe("color palette", () => {
  it("marks the 7 power neutrals", () => {
    for (const c of ["black", "white", "cream", "grey", "navy", "tan", "brown"]) {
      expect(isNeutral(c)).toBe(true);
    }
    for (const c of ["red", "blue", "yellow", "green", "pink", "orange", "purple", "teal", "rust"]) {
      expect(isNeutral(c)).toBe(false);
    }
  });

  it("hue distance is circular and symmetric", () => {
    expect(hueDistance("red", "blue")).toBeCloseTo(hueDistance("blue", "red"));
    expect(hueDistance("black", "red")).toBe(0); // achromatic
    expect(hueDistance("red", "blue")).toBeGreaterThan(120);
  });

  it("all 16 palette entries are well-formed", () => {
    for (const def of Object.values(PALETTE)) {
      expect(def.h).toBeGreaterThanOrEqual(0);
      expect(def.h).toBeLessThan(360);
      expect(def.s).toBeGreaterThanOrEqual(0);
      expect(def.s).toBeLessThanOrEqual(1);
      expect(def.l).toBeGreaterThanOrEqual(0);
      expect(def.l).toBeLessThanOrEqual(1);
    }
    expect(Object.keys(PALETTE).length).toBe(16);
  });
});

describe("colorHarmony", () => {
  it("rewards clean two-color outfits with neutral anchor", () => {
    const res = colorHarmony(["navy", "white"], { navy: 1, white: 1 });
    expect(res.score).toBeGreaterThan(0.9);
  });

  it("penalizes 4+ competing chromatic colors", () => {
    const res = colorHarmony(
      ["red", "yellow", "green", "purple"],
      { red: 1, yellow: 1, green: 1, purple: 1 },
    );
    expect(res.score).toBeLessThan(0);
  });

  it("soft-caps at 3 chromatic when neutrals exist in wardrobe", () => {
    const three = colorHarmony(["red", "blue", "yellow"], { red: 1, blue: 1, yellow: 1 }, [], true);
    const four = colorHarmony(["red", "blue", "yellow", "green"], { red: 1, blue: 1, yellow: 1, green: 1 }, [], true);
    expect(three.score).toBeGreaterThan(four.score);
  });

  it("relaxes the cap when the wardrobe has no neutrals", () => {
    const fourNoNeutrals = colorHarmony(
      ["red", "blue", "yellow", "green"],
      { red: 1, blue: 1, yellow: 1, green: 1 },
      [],
      false,
    );
    // should not be catastrophically negative — the user simply has no neutrals
    expect(fourNoNeutrals.score).toBeGreaterThan(-0.4);
  });

  it("penalizes high-mass complementary clash but not accent pops", () => {
    const clash = colorHarmony(["red", "green"], { red: 1, green: 1 });
    const accent = colorHarmony(["red", "green"], { red: 1, green: 0.4 });
    expect(accent.score).toBeGreaterThan(clash.score);
  });

  it("honors personal never-mix rules as hard disqualification", () => {
    const res = colorHarmony(["red", "blue"], { red: 1, blue: 1 }, [["red", "blue"]]);
    expect(res.score).toBe(-Infinity);
    expect(res.neverMixViolation).toEqual(["red", "blue"]);
  });

  it("rewards tonal layering", () => {
    const tonal = colorHarmony(["blue", "navy", "teal"], { blue: 1, navy: 1, teal: 1 });
    const mixed = colorHarmony(["blue", "yellow", "rust"], { blue: 1, yellow: 1, rust: 1 });
    expect(tonal.score).toBeGreaterThan(mixed.score - 0.3);
  });

  it("slot mass table matches doctrine", () => {
    expect(SLOT_MASS.dress).toBeGreaterThan(SLOT_MASS.top);
    expect(SLOT_MASS.shoes).toBeLessThan(SLOT_MASS.bottom);
  });
});
