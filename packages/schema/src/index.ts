/**
 * @styleme/schema — single source of truth for types shared between
 * the mobile app, the Cloudflare worker, and the ML export pipeline.
 *
 * Keep this package dependency-light (zod only). No side effects.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Slots & taxonomy
// ---------------------------------------------------------------------------

/** Functional slots an outfit must fill. */
export const SlotSchema = z.enum([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessory",
]);
export type Slot = z.infer<typeof SlotSchema>;

/** Curated 16-color palette. Deterministic CV maps to these names. */
export const ColorNameSchema = z.enum([
  "black",
  "white",
  "cream",
  "grey",
  "navy",
  "tan",
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
  "rust",
]);
export type ColorName = z.infer<typeof ColorNameSchema>;

export const PatternSchema = z.enum([
  "solid",
  "striped",
  "check",
  "floral",
  "graphic",
  "animal",
  "other",
]);
export type Pattern = z.infer<typeof PatternSchema>;

export const FitSchema = z.enum(["slim", "regular", "relaxed", "oversized"]);
export type Fit = z.infer<typeof FitSchema>;

/** 1 = street, 5 = formal. */
export const FormalitySchema = z.number().int().min(1).max(5);
export type Formality = z.infer<typeof FormalitySchema>;

export const SeasonSchema = z.enum(["warm", "cool", "all"]);
export type Season = z.infer<typeof SeasonSchema>;

/** Thermal weight proxy: light < 20C+ friendly, heavy < 12C needed. */
export const MaterialSchema = z.enum(["light", "medium", "heavy"]);
export type Material = z.infer<typeof MaterialSchema>;

// ---------------------------------------------------------------------------
// Garment
// ---------------------------------------------------------------------------

export const GarmentAttrsSchema = z.object({
  slot: SlotSchema,
  colors: z.array(ColorNameSchema).min(1).max(3),
  pattern: PatternSchema,
  fit: FitSchema,
  formality: FormalitySchema,
  season: SeasonSchema,
  material: MaterialSchema,
  /** Supervised subtype: t-shirt, button-down shirt, shorts, sneakers... */
  subtype: z.string().max(32).optional(),
  /** Optional free text the user typed ("my lucky blue shirt"). */
  nickname: z.string().max(64).optional(),
});
export type GarmentAttrs = z.infer<typeof GarmentAttrsSchema>;

export const GarmentStatusSchema = z.enum(["available", "in_use", "in_wash", "retired"]);
export type GarmentStatus = z.infer<typeof GarmentStatusSchema>;

export const GarmentSchema = z.object({
  id: z.string().min(1),
  attrs: GarmentAttrsSchema,
  status: GarmentStatusSchema.default("available"),
  /** Original camera photo, kept for re-segmentation. */
  originalRef: z.string().optional(),
  /** 512-d mobileclip embedding (base64) for novelty + future search. Optional in MVP. */
  embedding: z.string().optional(),
  /** Local file ref on the device; R2 key when backed up. */
  photoRef: z.string(),
  addedAt: z.number(),
  /** Last worn epoch ms, null if never. Drives rotation cooldowns. */
  lastWornAt: z.number().nullable().default(null),
  /** User corrections to auto-tags: { field, from, to } — flywheel data. */
  corrections: z
    .array(z.object({ field: z.string(), from: z.string(), to: z.string(), at: z.number() }))
    .default([]),
});
export type Garment = z.infer<typeof GarmentSchema>;

// ---------------------------------------------------------------------------
// Context & occasions
// ---------------------------------------------------------------------------

export const OccasionSchema = z.enum([
  "office",
  "date",
  "beach",
  "party",
  "errands",
  "gym",
  "casual",
]);
export type Occasion = z.infer<typeof OccasionSchema>;

export const MoodSchema = z.enum(["high", "chill", "focused", "tired", "none"]);
export type Mood = z.infer<typeof MoodSchema>;

export const WeatherContextSchema = z.object({
  tempC: z.number(),
  isRaining: z.boolean(),
});
export type WeatherContext = z.infer<typeof WeatherContextSchema>;

export const RecommendContextSchema = z.object({
  occasion: OccasionSchema,
  mood: MoodSchema.default("none"),
  weather: WeatherContextSchema,
  /** Epoch ms. Determinism anchor for exploration seeds. */
  now: z.number(),
});
export type RecommendContext = z.infer<typeof RecommendContextSchema>;

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

export const RuleReasonSchema = z.object({
  rule: z.string(),
  /** Signed contribution to the score. */
  score: z.number(),
  /** Human-readable explanation, tone-agnostic. */
  text: z.string(),
});
export type RuleReason = z.infer<typeof RuleReasonSchema>;

export const ScoredOutfitSchema = z.object({
  garmentIds: z.array(z.string()).min(3).max(6),
  score: z.number(),
  reasons: z.array(RuleReasonSchema),
});
export type ScoredOutfit = z.infer<typeof ScoredOutfitSchema>;

export const RecommendResponseSchema = z.object({
  outfits: z.array(ScoredOutfitSchema).min(1),
  /** Context snapshot used, for debug/learn. */
  context: RecommendContextSchema,
  ts: z.number(),
});
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

// ---------------------------------------------------------------------------
// Learning signals
// ---------------------------------------------------------------------------

export const LearnEventSchema = z.object({
  /** garmentIds of each outfit offered, in offer order. */
  suggestedIds: z.array(z.array(z.string()).min(1)),
  /**
   * "+"-joined garmentId string of the picked outfit (same shape the
   * client received in the suggestion), or null if the user dismissed
   * everything ("not today" — no negative signal is taken).
   */
  pickedId: z.string().nullable(),
  context: RecommendContextSchema,
  ts: z.number(),
});
export type LearnEvent = z.infer<typeof LearnEventSchema>;

export const LaundryEventSchema = z.object({
  garmentIds: z.array(z.string()).min(1),
  event: z.enum(["in_wash", "washed"]),
  /** When washed=true: available_at. When in_wash: expected back date (nullable). */
  expectedAvailableAt: z.number().nullable().default(null),
  ts: z.number(),
});
export type LaundryEvent = z.infer<typeof LaundryEventSchema>;

export const WardrobeSyncSchema = z.object({
  upserts: z.array(GarmentSchema),
  deletions: z.array(z.string()),
  ts: z.number(),
});
export type WardrobeSync = z.infer<typeof WardrobeSyncSchema>;

// ---------------------------------------------------------------------------
// Preference vector (learned)
// ---------------------------------------------------------------------------

export const PreferenceVectorSchema = z.object({
  /** color -> affinity in [-1, 1] */
  colors: z.record(z.string(), z.number()).default({}),
  /** pattern -> affinity in [-1, 1] */
  patterns: z.record(z.string(), z.number()).default({}),
  /** fit -> affinity in [-1, 1] */
  fits: z.record(z.string(), z.number()).default({}),
  /** formality drift: user's center of gravity, 1..5 */
  formalityCenter: z.number().min(1).max(5).default(3),
  /** How much the user likes mixing patterns (0..1). */
  patternMixing: z.number().min(0).max(1).default(0),
  /** Personal hard rules from long-press "never mix" in the why panel. */
  neverMix: z
    .array(z.object({ colorA: ColorNameSchema, colorB: ColorNameSchema }))
    .default([]),
  /** Number of pick events observed (confidence). */
  n: z.number().int().min(0).default(0),
});
export type PreferenceVector = z.infer<typeof PreferenceVectorSchema>;

export function emptyPreference(): PreferenceVector {
  return PreferenceVectorSchema.parse({
    n: 0,
  });
}

// ---------------------------------------------------------------------------
// Tone / persona
// ---------------------------------------------------------------------------

export const ToneProfileSchema = z.object({
  /** Which slang bank: genz | millennial | classic | none */
  bank: z.enum(["genz", "millennial", "classic", "none"]).default("none"),
  /** 0..1 intensity — how often slang swaps happen. */
  intensity: z.number().min(0).max(1).default(0.5),
});
export type ToneProfile = z.infer<typeof ToneProfileSchema>;
