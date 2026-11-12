/**
 * @styleme/engine — the StyleMe core.
 *
 * Pure, deterministic, dependency-light (schema only). Runs server-side
 * inside the Cloudflare worker; the same code is unit-tested in CI and can
 * run in the app for offline "last known good" recommendations.
 *
 * Public API:
 *   recommend(input)            → { outfits, meta }
 *   updatePreference(...)       → new PreferenceVector
 *   updateExploreState(...)     → new signature posteriors
 *   detectTone / toneText       → persona layer
 *   blendWeights                → ABO-learned weight merge
 */
import type {
  Garment,
  PreferenceVector,
  RecommendContext,
  RuleReason,
  ScoredOutfit,
} from "@styleme/schema";
import { generateCandidates, type Candidate } from "./candidates";
import {
  completenessRule,
  DEFAULT_WEIGHTS,
  OCCASION_BANDS,
  RULES,
  type EngineWeights,
  type RuleCtx,
} from "./rules";
import { colorHarmony } from "./color";
import { exploreScore, hashSeed, mulberry32, outfitSignature, type SignatureState } from "./explore";

export { DEFAULT_WEIGHTS, OCCASION_BANDS };
export type { EngineWeights } from "./rules";
export {
  updatePreference,
  EWA_ALPHA,
} from "./preference";
export {
  updateExploreState,
  betaSample,
  mulberry32,
  hashSeed,
  outfitSignature,
  type SignatureState,
} from "./explore";
export { detectTone, toneText, BANKS } from "./tone";
export * from "./color";
export * from "./candidates";
export * from "./rules";

// ---------------------------------------------------------------------------
// recommend()
// ---------------------------------------------------------------------------

export interface RecommendInput {
  userId: string;
  wardrobe: Garment[];
  context: RecommendContext;
  prefs: PreferenceVector;
  exploreState?: Record<string, SignatureState>;
  weights?: EngineWeights;
  /** Minimum number of options. Default 3 (product rule: always ≥3). */
  topK?: number;
}

export interface RecommendMeta {
  considered: number;
  droppedByStatus: number;
  droppedBySeason: number;
  candidatesScored: number;
  /** Signatures flagged as exploration picks. */
  exploredSignatures: string[];
  /** Slots the wardrobe can't fill at all (app should prompt to add). */
  missingSlots: string[];
  /** True when the season filter emptied the wardrobe and was relaxed. */
  seasonFallback: boolean;
  seed: string;
}

export interface RecommendResult {
  outfits: ScoredOutfit[];
  meta: RecommendMeta;
}

export function recommend(input: RecommendInput): RecommendResult {
  const { wardrobe, context, prefs, weights = DEFAULT_WEIGHTS, topK = 3 } = input;
  const rc: RuleCtx = {
    context,
    prefs,
    wardrobeHasNeutral: wardrobe.some((g) =>
      g.attrs.colors.some((c) => isNeutralColor(c)),
    ),
  };

  let generated = generateCandidates(wardrobe, context.weather);
  let seasonFallback = false;
  if (generated.candidates.length === 0 && wardrobe.some((g) => g.status === "available")) {
    // Auto season tags are noisy. Never return zero outfits just because the
    // whole wardrobe was tagged for the wrong season.
    generated = generateCandidates(wardrobe, { tempC: 18, isRaining: context.weather.isRaining });
    seasonFallback = true;
  }
  const { candidates, stats, options } = generated;

  // Exploration strength ramps with confidence: don't surprise new users,
  // but never stop diversifying.
  const strength = Math.min(0.5, 0.1 + 0.045 * Math.min(prefs.n, 9));
  const dayKey = new Date(context.now).toISOString().slice(0, 10);
  const seed = `${input.userId}:${dayKey}`;
  const rng = mulberry32(hashSeed(seed) >>> 0);

  const wantOuter = context.weather.tempC < 19 || context.weather.isRaining;

  interface Scored {
    outfit: ScoredOutfit;
    base: number;
    sig: string;
    final: number;
    explored: boolean;
  }
  const scored: Scored[] = [];

  for (const cand of candidates) {
    const comp = completenessRule(cand.items, rc);
    if (!Number.isFinite(comp.score)) continue;

    // Attach outerwear when contextually right: pick the one closest to
    // the candidate's formality center (a formal suit + puffer is a crime).
    let items = cand.items;
    if (wantOuter && options.outerwear.length > 0) {
      const center =
        0.7 * OCCASION_BANDS[context.occasion].center + 0.3 * prefs.formalityCenter;
      const best = [...options.outerwear].sort(
        (a, b) => Math.abs(a.attrs.formality - center) - Math.abs(b.attrs.formality - center),
      )[0]!;
      items = [...cand.items, best];
    }

    const reasons: RuleReason[] = [{ rule: "completeness", score: comp.score, text: comp.text }];
    let total = comp.score;
    let disqualified = false;
    for (const { name, weightKey, fn } of RULES) {
      const res = fn(items, rc);
      if (!Number.isFinite(res.score)) {
        disqualified = true;
        break;
      }
      const w = weights[weightKey] ?? 1;
      total += res.score * w;
      if (Math.abs(res.score * w) >= 0.05) {
        reasons.push({ rule: name, score: round3(res.score * w), text: res.text });
      }
    }
    if (disqualified) continue;

    // Personal never-mix is already inside colorRule (-Infinity → disqualified).
    const colors = items.flatMap((g) => g.attrs.colors);
    const sig = outfitSignature(cand.garmentIds, colors, items.some((g) => g.attrs.slot === "dress"));
    scored.push({
      outfit: {
        garmentIds: items.map((g) => g.id),
        score: round3(total),
        reasons,
      },
      base: total,
      sig,
      final: total,
      explored: false,
    });
  }

  // Dedupe near-identical families: keep at most 2 per signature, best first.
  scored.sort((a, b) => b.base - a.base);
  const perSig = new Map<string, number>();
  const kept: Scored[] = [];
  const dropped: Scored[] = [];
  for (const s of scored) {
    const count = perSig.get(s.sig) ?? 0;
    if (count >= 2) {
      dropped.push(s);
      continue;
    }
    perSig.set(s.sig, count + 1);
    kept.push(s);
  }

  // Product rule: always offer at least 3 options. If signature dedupe
  // collapsed the list, fill with the best remaining distinct outfits.
  if (kept.length < topK) {
    const seen = new Set(kept.map((s) => s.outfit.garmentIds.join("+")));
    for (const s of dropped) {
      if (kept.length >= topK) break;
      const key = s.outfit.garmentIds.join("+");
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(s);
    }
  }

  // Exploration pass.
  const bestBase = kept.length > 0 ? Math.max(...kept.map((s) => s.base)) : 0;
  const exploredSignatures: string[] = [];
  for (const s of kept) {
    const r = exploreScore(s.base, bestBase, strength, s.sig, input.exploreState, rng);
    s.final = r.score;
    s.explored = r.explored;
    if (r.explored) exploredSignatures.push(s.sig);
  }

  kept.sort((a, b) => b.final - a.final);

  // Greedy diversity: penalize reusing the same garment across options so the
  // three cards are actually different outfits, not one outfit with a swapped top.
  const REUSE_PENALTY = 0.35;
  const pool = [...kept];
  const top: Scored[] = [];
  const chosenIds = new Set<string>();
  const limit = Math.max(1, topK);
  while (top.length < limit && pool.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i]!;
      const reuse = candidate.outfit.garmentIds.filter((id) => chosenIds.has(id)).length;
      const adjusted = candidate.final - reuse * REUSE_PENALTY;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIdx = i;
      }
    }
    const [picked] = pool.splice(bestIdx, 1);
    if (!picked) break;
    top.push(picked);
    for (const id of picked.outfit.garmentIds) chosenIds.add(id);
  }

  // Missing-slot introspection so the app can say "add shoes".
  // Body is satisfied by (top AND bottom) OR dress. Shoes always required.
  const slotsOwned = new Set(wardrobe.map((g) => g.attrs.slot));
  const missingSlots: string[] = [];
  if (!slotsOwned.has("shoes")) missingSlots.push("shoes");
  const hasPair = slotsOwned.has("top") && slotsOwned.has("bottom");
  if (!hasPair && !slotsOwned.has("dress")) missingSlots.push("top + bottom (or a dress)");

  return {
    outfits: top.map((s) => s.outfit),
    meta: {
      considered: stats.considered,
      droppedByStatus: stats.droppedByStatus,
      droppedBySeason: stats.droppedBySeason,
      candidatesScored: kept.length,
      exploredSignatures,
      missingSlots,
      seasonFallback,
      seed,
    },
  };
}

// ---------------------------------------------------------------------------
// ABO-learned weights blend (notebook 03 exports learned weights; we mix)
// ---------------------------------------------------------------------------

/**
 * Blend hand-encoded weights with ABO-learned ones.
 * `learned` only contains the keys the notebook produced.
 */
export function blendWeights(
  hand: EngineWeights = DEFAULT_WEIGHTS,
  learned: Partial<EngineWeights> = {},
  mix = 0.5,
): EngineWeights {
  const out: EngineWeights = { ...hand };
  for (const key of Object.keys(hand) as (keyof EngineWeights)[]) {
    const l = learned[key];
    if (typeof l === "number") out[key] = hand[key] * (1 - mix) + l * mix;
  }
  return out;
}

// ---------------------------------------------------------------------------

function isNeutralColor(c: string): boolean {
  return ["black", "white", "cream", "grey", "navy", "tan", "brown"].includes(c);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
