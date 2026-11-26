/**
 * Wardrobe-depth arithmetic — the honest version of "what more pieces buy".
 *
 * Pure, local math on the garment list; no engine behavior, no network.
 * Every number surfaced to the user is a COMBINATION count, never a
 * "look" promise (rotation cooldowns make new ≠ immediate).
 */
import type { Garment } from "@styleme/schema";

/** Complete pair-shape combinations: tops×bottoms×shoes + dresses×shoes. */
export function outfitCombinations(
  tops: number,
  bottoms: number,
  dresses: number,
  shoes: number,
): number {
  return tops * bottoms * shoes + dresses * shoes;
}

export interface DepthRead {
  /** Non-retired pieces captured toward the target. */
  pieces: number;
  /** The user's onboarding size guess (T-030), clamped 10–60. */
  target: number;
  /** Photo'd, non-retired, available pieces — the register-shift gate. */
  photoPieces: number;
  /**
   * The core slot whose next addition unlocks the most combinations.
   * Only core slots (top/bottom/dress/shoes) claim unlocks — outerwear
   * and accessories ride contextual attach, so no honest count exists.
   */
  unlock?: { slot: string; label: string; unlocks: number };
}

const SLOT_LABEL: Record<string, string> = {
  top: "top",
  bottom: "bottom",
  dress: "dress",
  shoes: "pair of shoes",
};

/**
 * Depth read for Today + Wardrobe. `target` is the T-030 size guess.
 * The unlock line is only produced when a core slot is thin (≤2) — a deep
 * wardrobe gets no nudge, by design (quiet tone, never homework).
 */
export function depthRead(wardrobe: Garment[], target: number): DepthRead {
  const active = wardrobe.filter((g) => g.status !== "retired");
  const counts = { top: 0, bottom: 0, dress: 0, shoes: 0 } as Record<string, number>;
  let photoPieces = 0;
  for (const g of active) {
    if (g.attrs.slot in counts) counts[g.attrs.slot]!++;
    if (g.photoRef && g.status === "available") photoPieces++;
  }
  const now = outfitCombinations(counts.top!, counts.bottom!, counts.dress!, counts.shoes!);

  let best: DepthRead["unlock"];
  for (const slot of ["top", "bottom", "dress", "shoes"] as const) {
    // Shoes gate every outfit; a missing shoe slot means zero combos —
    // adding shoes is the unlock only when combos exist to multiply.
    if (slot !== "shoes" && counts.shoes === 0) continue;
    if (counts[slot]! > 2) continue; // deep slot — no nudge
    const next = { ...counts, [slot]: counts[slot]! + 1 };
    const unlocks =
      outfitCombinations(next.top!, next.bottom!, next.dress!, next.shoes!) - now;
    if (unlocks > 0 && (!best || unlocks > best.unlocks)) {
      best = { slot, label: SLOT_LABEL[slot]!, unlocks };
    }
  }

  return {
    pieces: active.length,
    target,
    photoPieces,
    unlock: best,
  };
}
