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
  ColorName,
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
import { colorHarmony, isNeutral } from "./color";
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
  /**
   * Slots the user owns but nothing is wearable right now (everything is
   * in the wash / retired) — e.g. "all your shoes are in the wash".
   */
  unavailableSlots: string[];
  /** True when the season filter emptied the wardrobe and was relaxed. */
  seasonFallback: boolean;
  /**
   * Personal never-mix pairs that filtered candidates out this run, so
   * the app can say "skipped rust + pink — you said never" instead of
   * letting the exclusion vanish.
   */
  skippedNeverMix: [ColorName, ColorName][];
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
      g.attrs.colors.some((c) => isNeutral(c as ColorName)),
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

  // Attachment pools pre-sorted by formality once, picked once: the best
  // coat for the occasion/user center (sort hoisted out of the scoring
  // loop — it used to re-sort per candidate for an identical answer).
  const outerByFormality = [...options.outerwear].sort(
    (a, b) => a.attrs.formality - b.attrs.formality,
  );
  const accessoryByFormality = [...options.accessories].sort(
    (a, b) => a.attrs.formality - b.attrs.formality,
  );
  const occasionCenter =
    0.7 * OCCASION_BANDS[context.occasion].center + 0.3 * prefs.formalityCenter;

  /** Closest-to-center garment from a formality-sorted pool (O(n) scan). */
  const closestByFormality = (pool: Garment[], center: number): Garment | null => {
    if (pool.length === 0) return null;
    let best = pool[0]!;
    let bestD = Math.abs(pool[0]!.attrs.formality - center);
    for (let i = 1; i < pool.length; i++) {
      const d = Math.abs(pool[i]!.attrs.formality - center);
      if (d < bestD) {
        bestD = d;
        best = pool[i]!;
      }
    }
    return best;
  };

  // Engine attachments: the contextually-right coat (cold/rain) and one
  // harmony-safe accessory (neutral, or a color already in the outfit).
  const coat = wantOuter ? closestByFormality(outerByFormality, occasionCenter) : null;
  const wornSafeAccessory = (a: Garment, cand: Candidate): boolean => {
    if (cand.items.length === 0) return false;
    const chromatic = new Set(
      cand.items.flatMap((g) => g.attrs.colors).filter((c) => !isNeutral(c as ColorName)),
    );
    return a.attrs.colors.every((c) => isNeutral(c as ColorName) || chromatic.has(c));
  };
  const accessory = options.accessories.length > 0
    ? closestByFormality(
        accessoryByFormality.filter((a) => a.attrs.colors.every((c) => isNeutral(c as ColorName))),
        occasionCenter,
      )
    : null;
  const attach = (cand: Candidate): Garment[] => {
    const extra: Garment[] = [];
    if (coat) extra.push(coat);
    if (accessory && wornSafeAccessory(accessory, cand)) extra.push(accessory);
    return extra;
  };

  interface Scored {
    outfit: ScoredOutfit;
    base: number;
    sig: string;
    final: number;
    explored: boolean;
    /** Ids the engine attached (coat/accessory) — exempt from reuse tax. */
    attached: Set<string>;
  }
  const scored: Scored[] = [];
  const skippedNeverMix = new Map<string, [ColorName, ColorName]>();

  for (const cand of candidates) {
    const comp = completenessRule(cand.items, rc);
    if (!Number.isFinite(comp.score)) continue;

    const extra = attach(cand);
    const items = extra.length > 0 ? [...cand.items, ...extra] : cand.items;

    const reasons: RuleReason[] = [{ rule: "completeness", score: comp.score, text: comp.text }];
    let total = comp.score;
    let disqualified = false;
    for (const { name, weightKey, fn } of RULES) {
      const res = fn(items, rc);
      if (!Number.isFinite(res.score)) {
        disqualified = true;
        if (res.neverMix) skippedNeverMix.set(res.neverMix.join("|"), res.neverMix);
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
      attached: new Set(extra.map((g) => g.id)),
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
  // three cards are actually different outfits, not one outfit with a swapped
  // top. Engine-attached pieces (the occasion's coat, the safe accessory)
  // are exempt: every option legitimately wears them, and taxing a shared
  // coat 0.35 per option used to eat the whole diversity budget (audit F-coat).
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
      const reuse = candidate.outfit.garmentIds.filter(
        (id) => chosenIds.has(id) && !candidate.attached.has(id),
      ).length;
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
  // Status-aware: a slot the user owns but can't fill right now (everything
  // in the wash) is a different message than "you don't own shoes".
  const slotsOwned = new Set(wardrobe.map((g) => g.attrs.slot));
  const slotsAvailable = new Set(wardrobe.filter((g) => g.status === "available").map((g) => g.attrs.slot));
  const missingSlots: string[] = [];
  if (!slotsOwned.has("shoes")) missingSlots.push("shoes");
  const hasPair = slotsOwned.has("top") && slotsOwned.has("bottom");
  if (!hasPair && !slotsOwned.has("dress")) missingSlots.push("top + bottom (or a dress)");
  const unavailableSlots = [...slotsOwned].filter((s) => !slotsAvailable.has(s));

  return {
    outfits: top.map((s) => s.outfit),
    meta: {
      considered: stats.considered,
      droppedByStatus: stats.droppedByStatus,
      droppedBySeason: stats.droppedBySeason,
      candidatesScored: kept.length,
      exploredSignatures,
      missingSlots,
      unavailableSlots,
      seasonFallback,
      skippedNeverMix: [...skippedNeverMix.values()],
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

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
