/**
 * Unit tests for the exploration layer (beta sampling, kick math,
 * signatures) — previously only exercised indirectly by the 1000-user
 * property simulation.
 */
import { describe, expect, it } from "vitest";
import {
  betaSample,
  exploreScore,
  hashSeed,
  mulberry32,
  outfitSignature,
  updateExploreState,
} from "../src/explore";

describe("betaSample", () => {
  it("stays finite inside [0,1] across shapes and seeds", () => {
    const shapes: [number, number][] = [
      [1, 1],
      [2, 2],
      [5, 3],
      [0.5, 0.5],
    ];
    for (const [a, b] of shapes) {
      const rng = mulberry32(hashSeed(`beta:${a}:${b}`) >>> 0);
      for (let i = 0; i < 200; i++) {
        const s = betaSample(a, b, rng);
        expect(Number.isFinite(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("exploreScore", () => {
  it("strength 0 is an exact no-op", () => {
    const rng = mulberry32(1);
    const r = exploreScore(1, 1.5, 0, "pair:red", undefined, rng);
    expect(r.score).toBe(1);
    expect(r.explored).toBe(false);
  });

  it("brand-new users (strength 0.1) can be flagged explored — the 0.04998 cap is gone", () => {
    // Pre-fix: kick carried a *0.6 that the score divided back out, so the
    // explored threshold (|kick| > 0.05) capped at 0.04998 and n=0 users
    // were NEVER flagged. Post-fix the same uncertainty (1 - 2/12 ≈ 0.833)
    // with strength 0.1 allows |kick| up to ~0.083.
    let flagged = 0;
    for (let i = 0; i < 300; i++) {
      const rng = mulberry32(hashSeed(`n0:${i}`) >>> 0);
      const r = exploreScore(1, 1.5, 0.1, "pair:red", undefined, rng);
      if (r.explored) flagged++;
    }
    expect(flagged).toBeGreaterThan(0);
    expect(flagged).toBeLessThan(150); // still the exception, not the rule
  });

  it("kick spread scales with distance from best, including boards below zero", () => {
    // best <= 0 used to flatten spread to a constant 0.3 — cold-weather
    // scoreboards were silently exploration-free. Same rng draw, larger
    // distance from best must produce a larger adjustment.
    let dNear = 0;
    let dFar = 0;
    for (let i = 0; i < 50 && dNear === 0; i++) {
      const seed = hashSeed(`spread:${i}`) >>> 0;
      const near = exploreScore(-0.9, -1, 0.5, "pair:red", undefined, mulberry32(seed));
      const far = exploreScore(-4, -1, 0.5, "pair:red", undefined, mulberry32(seed));
      dNear = Math.abs(near.score - -0.9);
      dFar = Math.abs(far.score - -4);
    }
    expect(dNear).toBeGreaterThan(0);
    expect(dFar).toBeGreaterThan(dNear);
  });

  it("explored-flag frequency ramps with strength", () => {
    const count = (strength: number) => {
      let flagged = 0;
      for (let i = 0; i < 300; i++) {
        const rng = mulberry32(hashSeed(`ramp:${strength}:${i}`) >>> 0);
        if (exploreScore(1, 1.5, strength, "pair:red", undefined, rng).explored) flagged++;
      }
      return flagged;
    };
    const low = count(0.1);
    const high = count(0.5);
    expect(high).toBeGreaterThan(low);
  });

  it("mature signatures explore less than fresh ones", () => {
    const mature = { "pair:red": { alpha: 6, beta: 6 } };
    const count = (state: Record<string, { alpha: number; beta: number }> | undefined) => {
      let flagged = 0;
      for (let i = 0; i < 300; i++) {
        const rng = mulberry32(hashSeed(`mature:${i}`) >>> 0);
        if (exploreScore(1, 1.5, 0.5, "pair:red", state, rng).explored) flagged++;
      }
      return flagged;
    };
    expect(count(mature)).toBeLessThan(count(undefined));
  });

  it("is deterministic for a fixed seed", () => {
    const a = exploreScore(2, 2.5, 0.3, "pair:blue", undefined, mulberry32(hashSeed("det") >>> 0));
    const b = exploreScore(2, 2.5, 0.3, "pair:blue", undefined, mulberry32(hashSeed("det") >>> 0));
    expect(a).toEqual(b);
  });
});

describe("outfitSignature", () => {
  it("is shape + first chromatic color, mono when all-neutral", () => {
    expect(outfitSignature(["a", "b"], ["red", "black"], false)).toBe("pair:red");
    expect(outfitSignature(["a", "b"], ["black", "white"], true)).toBe("dress:mono");
    expect(outfitSignature(["a"], ["navy", "rust"], false)).toBe("pair:rust");
  });
});

describe("updateExploreState", () => {
  it("picked signature +alpha, offered-but-unpicked +beta, picked never penalized", () => {
    const next = updateExploreState({}, "pair:red", ["pair:red", "pair:blue"]);
    expect(next["pair:red"]).toEqual({ alpha: 2, beta: 1 });
    expect(next["pair:blue"]).toEqual({ alpha: 1, beta: 2 });
  });
});
