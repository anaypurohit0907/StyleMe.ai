/**
 * Preference vector — the learned per-user taste model.
 *
 * Update rule: exponential moving average (EWA) over pick events.
 * Each pick is a full positive example: every attribute of the chosen
 * outfit gets nudge toward +1; each suggested-but-rejected outfit gets a
 * weaker nudge toward -1 (only when the user actively picked something
 * else — a "not today" dismissal carries no negative signal, to avoid
 * punishing outfits on bad-mood days).
 */
import type {
  LearnEvent,
  PreferenceVector,
  RecommendContext,
  ScoredOutfit,
  Garment,
} from "@styleme/schema";

export const EWA_ALPHA = 0.15;

function clamp(v: number, lo = -1, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}

interface PickInput {
  picked: ScoredOutfit | null;
  /** Only used when picked != null. */
  rejected?: ScoredOutfit[];
  garments: Map<string, Garment>;
  occasion: RecommendContext["occasion"];
}

/**
 * Apply one pick event to the preference vector.
 * Returns a NEW vector (immutable update).
 */
export function updatePreference(prefs: PreferenceVector, ev: PickInput): PreferenceVector {
  const next: PreferenceVector = {
    colors: { ...prefs.colors },
    patterns: { ...prefs.patterns },
    fits: { ...prefs.fits },
    formalityCenter: prefs.formalityCenter,
    patternMixing: prefs.patternMixing,
    neverMix: [...prefs.neverMix],
    n: prefs.n + 1,
  };
  const alpha = EWA_ALPHA;

  const nudge = (
    table: Record<string, number>,
    key: string,
    direction: 1 | -1,
    strength: number,
  ) => {
    const cur = table[key] ?? 0;
    table[key] = clamp(cur + alpha * direction * strength);
  };

  const applyOutfit = (o: ScoredOutfit, direction: 1 | -1, strength: number) => {
    for (const id of o.garmentIds) {
      const g = ev.garments.get(id);
      if (!g) continue;
      for (const c of g.attrs.colors) nudge(next.colors, c, direction, 0.5 * strength);
      nudge(next.patterns, g.attrs.pattern, direction, strength);
      nudge(next.fits, g.attrs.fit, direction, strength);
    }
    // Formality center of gravity drifts toward the formality mix of the pick.
    const g = o.garmentIds.map((id) => ev.garments.get(id)).filter(Boolean) as Garment[];
    if (g.length > 0) {
      const meanFormality =
        g.reduce((s, x) => s + x.attrs.formality, 0) / g.length;
      next.formalityCenter = clamp(
        next.formalityCenter + alpha * direction * (meanFormality - next.formalityCenter),
        1,
        5,
      );
      // Pattern mixing tolerance: did the pick mix patterns?
      const patterns = g.map((x) => x.attrs.pattern);
      const mixed = new Set(patterns.filter((p) => p !== "solid")).size >= 2;
      if (direction === 1) {
        next.patternMixing = clamp(
          next.patternMixing + alpha * (mixed ? 0.5 : -0.2),
          0,
          1,
        );
      }
    }
    void ev.occasion;
  };

  if (ev.picked) {
    applyOutfit(ev.picked, 1, 1);
    for (const r of ev.rejected ?? []) {
      applyOutfit(r, -1, 0.35);
    }
  }
  // "not today" (picked == null): no signal. The rotation rule already
  // handles the consequence.

  return next;
}
