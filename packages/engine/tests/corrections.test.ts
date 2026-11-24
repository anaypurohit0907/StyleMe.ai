import { describe, expect, it } from "vitest";
import type { Correction, GarmentAttrs } from "@styleme/schema";
import { applyCorrections, diffCorrections } from "@styleme/schema/corrections";

const BASE: GarmentAttrs = {
  slot: "accessory",
  colors: ["grey"],
  pattern: "solid",
  fit: "regular",
  formality: 1,
  season: "cool",
  material: "medium",
};

function correction(over: Partial<Correction>): Correction {
  return { field: "slot", from: "accessory", to: "top", at: 1, ...over };
}

describe("tag corrections", () => {
  it("diffs only fields that changed", () => {
    const edited: GarmentAttrs = {
      ...BASE,
      slot: "top",
      colors: ["rust", "tan"],
      formality: 4,
    };
    expect(diffCorrections(BASE, edited, 100)).toEqual([
      { field: "slot", from: "accessory", to: "top", at: 100 },
      { field: "colors", from: "grey", to: "rust,tan", at: 100 },
      { field: "formality", from: "1", to: "4", at: 100 },
    ]);
  });

  it("returns nothing when the draft is unchanged", () => {
    expect(diffCorrections(BASE, { ...BASE, colors: [...BASE.colors] }, 100)).toEqual([]);
  });

  it("applies the latest correction per field", () => {
    const model: GarmentAttrs = { ...BASE, slot: "bottom", formality: 2 };
    const applied = applyCorrections(model, [
      correction({ field: "slot", to: "top", at: 1 }),
      correction({ field: "slot", from: "top", to: "outerwear", at: 2 }),
      correction({ field: "formality", from: "2", to: "5", at: 3 }),
    ]);
    expect(applied.slot).toBe("outerwear");
    expect(applied.formality).toBe(5);
  });

  it("drops unknown enum values and survives stale colors", () => {
    const model: GarmentAttrs = { ...BASE, slot: "bottom", colors: ["navy"] };
    const applied = applyCorrections(model, [
      correction({ field: "slot", to: "gown", at: 1 }),
      correction({ field: "colors", from: "navy", to: "navy,chartreuse", at: 2 }),
      correction({ field: "pattern", to: "tie-dye", at: 3 }),
    ]);
    expect(applied.slot).toBe("bottom");
    expect(applied.colors).toEqual(["navy"]);
    expect(applied.pattern).toBe("solid");
  });

  it("parses formality strictly", () => {
    const applied = applyCorrections(BASE, [
      correction({ field: "formality", from: "1", to: "3abc", at: 1 }),
      correction({ field: "formality", from: "1", to: "9", at: 2 }),
    ]);
    expect(applied.formality).toBe(5);
  });

  it("is a no-op with no corrections", () => {
    expect(applyCorrections(BASE, [])).toBe(BASE);
  });
});
