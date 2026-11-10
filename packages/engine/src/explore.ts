/**
 * Exploration — the anti-herd mechanism.
 *
 * Two layers:
 *  1. Seeded deterministic noise (mulberry32, seeded by userId+date) so the
 *     same user gets stable variety within a day but a fresh mix tomorrow.
 *  2. Thompson sampling over outfit *signatures* (dominant color + shape):
 *     each signature has a Beta posterior the worker persists. Weakly-explored
 *     signatures get their score bumped by sampled uncertainty, so a
 *     slightly-worse look in an under-explored family wins sometimes.
 *
 * This guarantees: (a) small wardrobes still see variety, (b) two users with
 * identical wardrobes diverge over time because their pick histories (and
 * therefore Beta posteriors) diverge.
 */

/** cyrb53 → 32-bit seed from a string. */
export function hashSeed(str: string): number {
  let h1 = 0xdeadbeef ^ 7;
  let h2 = 0x41c6ce57 ^ 7;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) * 2 ** 32 + (h1 >>> 0);
}

/** mulberry32 PRNG. Returns a function producing [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approximate Beta(a,b) sample via Gammas (Marsaglia polar for gamma<1 boost). */
function gammaSample(shape: number, rng: () => number): number {
  if (shape < 1) {
    const u = rng();
    return gammaSample(shape + 1, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      x = randn(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randn(rng: () => number): number {
  // Box–Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function betaSample(alpha: number, beta: number, rng: () => number): number {
  const a = gammaSample(alpha, rng);
  const b = gammaSample(beta, rng);
  return a / (a + b);
}

export interface SignatureState {
  alpha: number;
  beta: number;
}

/**
 * Exploration-adjusted score.
 *
 * @param base       rule score
 * @param best       current best base score (for normalization)
 * @param strength   0..1 — ramps up with preference confidence (n picks)
 * @param sig        the outfit's signature key
 * @param state      persistent Beta posterior for that signature
 * @param rng        seeded PRNG
 */
export function exploreScore(
  base: number,
  best: number,
  strength: number,
  sig: string,
  state: Record<string, SignatureState> | undefined,
  rng: () => number,
): { score: number; explored: boolean } {
  if (strength <= 0) return { score: base, explored: false };
  const s = state?.[sig];
  const alpha = s?.alpha ?? 1;
  const beta = s?.beta ?? 1;
  // Uncertainty of a Beta grows when both counts are small.
  const uncertainty = alpha + beta < 8 ? 1 - (alpha + beta) / 12 : 0.25;
  const sample = betaSample(alpha + 1, beta + 1, rng);
  // Nudge: explored signatures pull toward their own mean; unexplored get
  // a random kick so they can rise above a marginally better known look.
  const kick = (sample - 0.5) * 2 * strength * uncertainty * 0.6;
  const spread = best > 0 ? Math.abs(base - best) + 0.3 : 0.3;
  const score = base + (kick * spread) / 0.6;
  return { score, explored: Math.abs(kick) > 0.05 };
}

/**
 * Outfit signature: shape (dress vs top-bottom) + dominant color.
 * Coarse on purpose — it's a family, not an identity.
 */
export function outfitSignature(
  garmentIds: string[],
  colors: string[],
  isDress: boolean,
): string {
  const shape = isDress ? "dress" : "pair";
  const chromatic = colors.filter((c) => !["black", "white", "cream", "grey", "navy", "tan", "brown"].includes(c));
  const dom = chromatic[0] ?? "mono";
  return `${shape}:${dom}`;
}

/**
 * Update the persistent signature posteriors after a pick event.
 * Picked signature → success (alpha+1). Offered signatures → failure (beta+1).
 */
export function updateExploreState(
  state: Record<string, SignatureState>,
  pickedSig: string | null,
  offeredSigs: string[],
): Record<string, SignatureState> {
  const next: Record<string, SignatureState> = { ...state };
  const touch = (sig: string, delta: "alpha" | "beta") => {
    const cur = next[sig] ?? { alpha: 1, beta: 1 };
    next[sig] = { alpha: cur.alpha + (delta === "alpha" ? 1 : 0), beta: cur.beta + (delta === "beta" ? 1 : 0) };
  };
  if (pickedSig) touch(pickedSig, "alpha");
  for (const sig of offeredSigs) {
    if (sig !== pickedSig) touch(sig, "beta");
  }
  return next;
}
