import { describe, expect, it } from "vitest";
import type { Garment, GarmentAttrs, GarmentStatus, Slot } from "@styleme/schema";
import { gapAnalysis } from "../src";

const baseAttrs: GarmentAttrs = {
  slot: "top",
  colors: ["black"],
  pattern: "solid",
  fit: "regular",
  formality: 2,
  season: "all",
  material: "medium",
};

function g(
  id: string,
  slot: Slot,
  overrides: Partial<GarmentAttrs> = {},
  status: GarmentStatus = "available",
): Garment {
  return {
    id,
    attrs: { ...baseAttrs, slot, ...overrides },
    status,
    photoRef: `local://${id}`,
    addedAt: 1,
    lastWornAt: null,
    corrections: [],
  };
}

function ids(wardrobe: Garment[]): string[] {
  return gapAnalysis(wardrobe).map((gap) => gap.id);
}

describe("gapAnalysis", () => {
  it("starts an empty wardrobe with the core three", () => {
    const gaps = gapAnalysis([]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ id: "core", priority: 100 });
  });

  it("puts missing shoes first on a top+bottom wardrobe", () => {
    const gaps = gapAnalysis([g("t", "top"), g("b", "bottom")]);
    expect(gaps[0]?.id).toBe("shoes");
    expect(ids([g("t", "top"), g("b", "bottom")])).not.toContain("core");
  });

  it("accepts dress+shoes as complete and does not ask for a top/bottom", () => {
    const gaps = ids([g("d", "dress"), g("s", "shoes", { formality: 4 })]);
    expect(gaps).not.toContain("shoes");
    expect(gaps).not.toContain("top");
    expect(gaps).not.toContain("bottom");
    expect(gaps).not.toContain("core");
  });

  it("suggests depth, warmth, office formality and color for a thin neutral wardrobe", () => {
    const wardrobe = [
      g("t", "top"),
      g("b", "bottom"),
      g("s", "shoes"),
    ];
    const gaps = gapAnalysis(wardrobe);
    expect(gaps.length).toBeLessThanOrEqual(5);
    expect(gaps.map((x) => x.id)).toEqual(
      expect.arrayContaining([
        "warm-layer",
        "bottom-depth",
        "shoe-depth",
        "office-shoe",
        "dressed-up",
      ]),
    );
    // Depth/warmth outrank palette on a three-piece wardrobe; color is a
    // later unlock, not a top-five emergency.
    expect(gaps.map((x) => x.id)).not.toContain("color");
  });

  it("ignores retired items when deciding a slot is missing", () => {
    const gaps = ids([g("t", "top"), g("b", "bottom"), g("s", "shoes", {}, "retired")]);
    expect(gaps).toContain("shoes");
  });

  it("counts in-wash items as owned — do not tell the user to buy another", () => {
    const gaps = ids([
      g("t", "top", { formality: 4 }),
      g("b", "bottom"),
      g("s", "shoes", { formality: 4 }, "in_wash"),
    ]);
    expect(gaps).not.toContain("shoes");
  });

  it("suggests a real warm layer when outerwear is only light", () => {
    const gaps = ids([
      g("t", "top", { formality: 4 }),
      g("b", "bottom"),
      g("s", "shoes", { formality: 4 }),
      g("o", "outerwear", { season: "warm", material: "light" }),
    ]);
    expect(gaps).toContain("warm-layer");
  });

  it("does not ask for a dress-up piece when formality 4 is covered", () => {
    const gaps = ids([
      g("t", "top", { formality: 4 }),
      g("b", "bottom", { formality: 4 }),
      g("s", "shoes", { formality: 4 }),
    ]);
    expect(gaps).not.toContain("dressed-up");
  });

  it("flags an all-cool wardrobe as thin on warm weather", () => {
    const gaps = ids([
      g("d", "dress", { season: "cool", formality: 4 }),
      g("s", "shoes", { season: "cool", formality: 4 }),
    ]);
    expect(gaps).toContain("warm-weather");
  });

  it("only flags an all-neutral palette, not a colorful one", () => {
    const base = [
      g("t1", "top", { formality: 4 }),
      g("t2", "top", { formality: 4 }),
      g("b1", "bottom", { formality: 4 }),
      g("b2", "bottom", { formality: 4 }),
      g("s1", "shoes", { formality: 4 }),
      g("s2", "shoes", { formality: 4 }),
      g("o", "outerwear", { formality: 4, material: "heavy" }),
      g("a", "accessory", { formality: 4 }),
    ];
    expect(ids(base)).toContain("color");

    const colorful = base.map((item) =>
      item.id === "t1" ? { ...item, attrs: { ...item.attrs, colors: ["rust" as const] } } : item,
    );
    expect(ids(colorful)).not.toContain("color");
  });

  it("caps at five and is deterministic / priority-ordered", () => {
    const wardrobe = [
      g("t", "top"),
      g("b", "bottom"),
      g("s", "shoes"),
      g("d", "dress"),
    ];
    const first = gapAnalysis(wardrobe);
    const second = gapAnalysis(wardrobe);
    expect(first).toEqual(second);
    expect(first.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < first.length; i++) {
      expect(first[i - 1]!.priority).toBeGreaterThanOrEqual(first[i]!.priority);
    }
  });
});
