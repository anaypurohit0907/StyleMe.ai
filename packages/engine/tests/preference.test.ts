import { describe, expect, it } from "vitest";
import { emptyPreference } from "@styleme/schema";
import type { Garment, ScoredOutfit } from "@styleme/schema";
import { updatePreference, EWA_ALPHA } from "../src/preference";

function garment(id: string, over: Partial<Garment["attrs"]> = {}): Garment {
  return {
    id,
    attrs: {
      slot: "top",
      colors: ["blue"],
      pattern: "solid",
      fit: "regular",
      formality: 3,
      season: "all",
      material: "medium",
      ...over,
    },
    status: "available",
    photoRef: `local://${id}`,
    addedAt: 0,
    lastWornAt: null,
    corrections: [],
  };
}

function outfit(garments: Garment[], score = 1): ScoredOutfit {
  return { garmentIds: garments.map((g) => g.id), score, reasons: [] };
}

describe("updatePreference (EWA learning)", () => {
  it("nudges picked attributes toward +1 and rejects toward -1", () => {
    const prefs = emptyPreference();
    const blueShirt = garment("t1", { colors: ["blue"], pattern: "solid", fit: "slim" });
    const redJeans = garment("b1", { slot: "bottom", colors: ["red"], pattern: "striped", fit: "relaxed" });
    const ev = {
      picked: outfit([blueShirt]),
      rejected: [outfit([redJeans])],
      garments: new Map([
        ["t1", blueShirt],
        ["b1", redJeans],
      ]),
      occasion: "casual" as const,
    };
    const next = updatePreference(prefs, ev);
    expect(next.n).toBe(1);
    expect(next.colors["blue"]).toBeGreaterThan(0);
    expect(next.colors["red"]).toBeLessThan(0);
    expect(next.fits["slim"]).toBeGreaterThan(0);
    expect(next.fits["relaxed"]).toBeLessThan(0);
    expect(next.patterns["striped"]).toBeLessThan(0);
  });

  it("repeated picks saturate toward ±1, never beyond", () => {
    let prefs = emptyPreference();
    const shirt = garment("t1", { colors: ["teal"], pattern: "check", fit: "oversized" });
    for (let i = 0; i < 50; i++) {
      prefs = updatePreference(prefs, {
        picked: outfit([shirt]),
        garments: new Map([["t1", shirt]]),
        occasion: "date",
      });
    }
    expect(prefs.colors["teal"]).toBeLessThanOrEqual(1);
    expect(prefs.patterns["check"]).toBeLessThanOrEqual(1);
    expect(prefs.fits["oversized"]).toBeLessThanOrEqual(1);
    // and should be strongly positive after 50 picks
    expect(prefs.colors["teal"]).toBeGreaterThan(0.9);
  });

  it("formality center drifts toward the user's picks", () => {
    let prefs = emptyPreference();
    const formal = garment("t1", { formality: 5 });
    for (let i = 0; i < 30; i++) {
      prefs = updatePreference(prefs, {
        picked: outfit([formal]),
        garments: new Map([["t1", formal]]),
        occasion: "office",
      });
    }
    expect(prefs.formalityCenter).toBeGreaterThan(4);
  });

  it("pattern-mixing tolerance rises when the user picks mixed patterns", () => {
    let prefs = emptyPreference();
    const striped = garment("t1", { pattern: "striped" });
    const floral = garment("b1", { slot: "bottom", pattern: "floral", colors: ["navy"] });
    for (let i = 0; i < 20; i++) {
      prefs = updatePreference(prefs, {
        picked: outfit([striped, floral]),
        garments: new Map([
          ["t1", striped],
          ["b1", floral],
        ]),
        occasion: "casual",
      });
    }
    expect(prefs.patternMixing).toBeGreaterThan(0.3);
  });

  it("a 'not today' dismissal carries no negative signal", () => {
    const prefs = emptyPreference();
    const shirt = garment("t1", { colors: ["purple"] });
    const next = updatePreference(prefs, {
      picked: null,
      garments: new Map([["t1", shirt]]),
      occasion: "party",
    });
    expect(next.n).toBe(1);
    expect(next.colors["purple"]).toBeUndefined();
    expect(next.patterns["solid"]).toBeUndefined();
  });

  it("EWA alpha is small (0.15) — one pick shouldn't define the user", () => {
    expect(EWA_ALPHA).toBeCloseTo(0.15);
  });
});
