import { describe, expect, it } from "vitest";
import { emptyPreference } from "@styleme/schema";
import type { Garment } from "@styleme/schema";
import { updateExploreState, recommend, updatePreference } from "../src";
import { makeContext, makeWardrobe, pickIndex } from "./helpers";

/**
 * The uniqueness invariant — the product's founding promise:
 * "if everyone in the world uses the app, no two people's styles
 * will be the exact same."
 *
 * Calibration (per product owner): SOME convergence is correct and even
 * desirable — a good engine should keep offering the genuinely best looks.
 * COMPLETE MONOTONY is the failure mode: every user seeing the same outfit
 * every day, with no personal drift.
 *
 * Simulation: 1000 users, IDENTICAL wardrobe, 40 days of daily picks.
 * Each user picks from a different seed — same products, different lives.
 *
 * Assertions:
 *  1. personal daily variety: one user's top-1 across 40 days is NOT one
 *     repeated outfit — they see many different looks over time.
 *  2. no global herd: distinct top-1 offers across the user base on the
 *     final day ≥ 10 (15 observed on the original 90-day run; 1–3 would be
 *     a herd).
 *  3. preference vectors diverge (mean pairwise distance > floor).
 *  4. exploration state accumulates (the fuel for #1).
 */
describe("uniqueness invariant (1000-user simulation)", () => {
  const USERS = 1000;
  const DAYS = 40;
  // Compact wardrobe keeps the sim fast while preserving all six slots.
  const wardrobe = makeWardrobe({
    seed: 2026,
    slotPlan: { top: 6, bottom: 4, dress: 2, shoes: 4, outerwear: 2, accessory: 2 },
  });
  const baseContext = makeContext({ occasion: "casual", tempC: 18 });

  it("diverges over 40 days without full monotony", () => {
    const prefs = Array.from({ length: USERS }, () => emptyPreference());
    const explore = Array.from({ length: USERS }, () => ({} as Record<string, { alpha: number; beta: number }>));
    const garmentMap = new Map<string, Garment>(wardrobe.map((g) => [g.id, g]));

    const top1sByDay = new Map<number, Set<string>>();
    // probe user = user 0: track personal daily variety
    const probeTop1s = new Set<string>();
    const probeOffered = new Set<string>();

    for (let day = 0; day < DAYS; day++) {
      const context = {
        ...baseContext,
        occasion: (["office", "date", "errands", "casual", "party"] as const)[day % 5]!,
        weather: { tempC: 10 + ((day * 3) % 20), isRaining: day % 7 === 0 },
        now: baseContext.now + day * 86_400_000,
      };
      const dayTop1s = new Set<string>();

      for (let u = 0; u < USERS; u++) {
        const res = recommend({
          userId: `sim-${u}`,
          wardrobe,
          context,
          prefs: prefs[u]!,
          exploreState: explore[u],
        });
        if (res.outfits.length === 0) continue;
        const top1 = res.outfits[0]!;
        dayTop1s.add(top1.garmentIds.join("+"));
        if (u === 0) {
          probeTop1s.add(top1.garmentIds.join("+"));
          for (const o of res.outfits) probeOffered.add(o.garmentIds.join("+"));
        }

        const idx = pickIndex(res.outfits.length, day, u);
        const picked = res.outfits[idx] ?? null;
        prefs[u] = updatePreference(
          prefs[u]!,
          picked
            ? {
                picked,
                rejected: res.outfits.filter((_, i) => i !== idx),
                garments: garmentMap,
                occasion: context.occasion,
              }
            : { picked: null, garments: garmentMap, occasion: context.occasion },
        );
        // Keep explore state lightweight: top-3 signatures only.
        const NEUTRALS = ["black", "white", "cream", "grey", "navy", "tan", "brown"];
        const sigs = res.outfits.slice(0, 3).map((o) => {
          const colors = o.garmentIds.flatMap((id) => garmentMap.get(id)!.attrs.colors);
          const isDress = o.garmentIds.some((id) => garmentMap.get(id)!.attrs.slot === "dress");
          const chromatic = colors.filter((c) => !NEUTRALS.includes(c));
          return `${isDress ? "dress" : "pair"}:${chromatic[0] ?? "mono"}`;
        });
        const pickedSig = picked ? (sigs[res.outfits.indexOf(picked)] ?? null) : null;
        explore[u] = updateExploreState(explore[u], pickedSig, sigs);
      }
      top1sByDay.set(day, dayTop1s);
    }

    // 1. Personal daily variety: the probe user's top-1 over 40 days is not
    //    a single repeated outfit, and they were offered a real menu.
    expect(probeTop1s.size).toBeGreaterThanOrEqual(8); // not one look 40 days
    expect(probeOffered.size).toBeGreaterThanOrEqual(15); // menu breadth

    // 2. No global herd on the final day.
    const lastDay = top1sByDay.get(DAYS - 1)!;
    expect(lastDay.size).toBeGreaterThanOrEqual(10);

    // 3. Preference vectors diverged (sample 100 users).
    const sample = prefs.slice(0, 100);
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < sample.length; i++) {
      for (let j = i + 1; j < sample.length; j++) {
        total += vectorDistance(sample[i]!, sample[j]!);
        pairs++;
      }
    }
    expect(total / pairs).toBeGreaterThan(0.01);

    // 4. Exploration state accumulated.
    expect(Object.keys(explore[999]!).length).toBeGreaterThan(0);
  }, 180_000);
});

function vectorDistance(
  a: ReturnType<typeof emptyPreference>,
  b: ReturnType<typeof emptyPreference>,
): number {
  let d = 0;
  for (const k of new Set([...Object.keys(a.colors), ...Object.keys(b.colors)])) {
    d += Math.abs((a.colors[k] ?? 0) - (b.colors[k] ?? 0));
  }
  for (const k of new Set([...Object.keys(a.patterns), ...Object.keys(b.patterns)])) {
    d += Math.abs((a.patterns[k] ?? 0) - (b.patterns[k] ?? 0));
  }
  for (const k of new Set([...Object.keys(a.fits), ...Object.keys(b.fits)])) {
    d += Math.abs((a.fits[k] ?? 0) - (b.fits[k] ?? 0));
  }
  d += Math.abs(a.formalityCenter - b.formalityCenter) * 0.2;
  d += Math.abs(a.patternMixing - b.patternMixing);
  return d;
}
