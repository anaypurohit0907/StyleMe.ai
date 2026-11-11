/**
 * The first-principles rule set.
 *
 * Every rule is a pure function returning { score, text }. Text is the
 * user-facing "why" (tone-agnostic — the tone engine rewords it later).
 * A score of -Infinity is a hard disqualification.
 */
import type {
  ColorName,
  Fit,
  Garment,
  Occasion,
  PreferenceVector,
  RecommendContext,
} from "@styleme/schema";
import { colorHarmony, SLOT_MASS } from "./color";

export interface RuleScore {
  score: number;
  text: string;
}

export interface RuleCtx {
  context: RecommendContext;
  prefs: PreferenceVector;
  /** Does the wardrobe contain any neutral item? (relaxes 60-30-10) */
  wardrobeHasNeutral: boolean;
}

export type Rule = (items: Garment[], rc: RuleCtx) => RuleScore;

// ---------------------------------------------------------------------------
// Occasion bands: [min, max, center]
// ---------------------------------------------------------------------------

export const OCCASION_BANDS: Record<Occasion, { min: number; max: number; center: number }> = {
  office: { min: 3, max: 5, center: 4 },
  date: { min: 2, max: 4, center: 3 },
  party: { min: 2, max: 5, center: 3.5 },
  beach: { min: 1, max: 2, center: 1.5 },
  errands: { min: 1, max: 3, center: 2 },
  gym: { min: 1, max: 2, center: 1.5 },
  casual: { min: 1, max: 3, center: 2 },
};

// ---------------------------------------------------------------------------
// 1. Completeness (hard)
// ---------------------------------------------------------------------------

export const completenessRule: Rule = (items) => {
  const slots = new Set(items.map((g) => g.attrs.slot));
  const hasDress = slots.has("dress");
  const hasTopBottom = slots.has("top") && slots.has("bottom");
  if (!hasDress && !hasTopBottom) {
    return { score: -Infinity, text: "missing core pieces" };
  }
  if (!slots.has("shoes")) {
    return { score: -Infinity, text: "missing shoes" };
  }
  return { score: 0.2, text: "complete outfit" };
};

// ---------------------------------------------------------------------------
// 2. Color harmony (see color.ts)
// ---------------------------------------------------------------------------

export const colorRule: Rule = (items, rc) => {
  const slotByColor: Record<string, number> = {};
  const colors: ColorName[] = [];
  for (const g of items) {
    const mass = SLOT_MASS[g.attrs.slot] ?? 0.5;
    for (const c of g.attrs.colors) {
      colors.push(c);
      slotByColor[c] = Math.max(slotByColor[c] ?? 0, mass);
    }
  }
  const neverMix = rc.prefs.neverMix.map(
    (p) => [p.colorA, p.colorB] as [ColorName, ColorName],
  );
  const res = colorHarmony(colors, slotByColor, neverMix, rc.wardrobeHasNeutral);
  return { score: res.score, text: res.text };
};

// ---------------------------------------------------------------------------
// 3. Formality match
// ---------------------------------------------------------------------------

export const formalityRule: Rule = (items, rc) => {
  const band = OCCASION_BANDS[rc.context.occasion];
  // Blend occasion center with the user's learned center of gravity.
  const center = 0.7 * band.center + 0.3 * rc.prefs.formalityCenter;
  let dev = 0;
  let over2 = 0;
  let dev2 = 0;
  for (const g of items) {
    const w = g.attrs.slot === "shoes" ? 0.8 : g.attrs.slot === "accessory" ? 0.3 : 1;
    const d = Math.abs(g.attrs.formality - center);
    dev += d * w;
    if (d > 2) over2++;
    if (d === 2) dev2++;
  }
  const n = items.length || 1;
  const avgDev = dev / n;
  let score: number;
  if (over2 > 0) score = -0.3;
  else if (avgDev <= 0.25) score = 1.0;
  else if (avgDev <= 0.75) score = 0.5;
  else if (avgDev <= 1.25) score = 0;
  else score = -0.2;

  // Smart-casual mix: exactly one deliberate off-band piece, rest clean.
  if (dev2 === 1 && over2 === 0 && avgDev <= 1.0) {
    score += 0.1;
    return { score, text: `one deliberate twist for a ${rc.context.occasion} look` };
  }
  if (avgDev <= 0.75) return { score, text: `formality matches ${rc.context.occasion}` };
  return { score, text: `formality drifts from ${rc.context.occasion}` };
};

// ---------------------------------------------------------------------------
// 4. Silhouette balance (top vs bottom fits)
// ---------------------------------------------------------------------------

const FIT_ORDER: Record<Fit, number> = { slim: 0, regular: 1, relaxed: 2, oversized: 3 };

const SILHOUETTE_SCORE: Record<string, number> = {
  "slim|slim": 0.1,
  "slim|regular": 0.4,
  "regular|slim": 0.4,
  "regular|regular": 0.4,
  "slim|relaxed": 0.6,
  "relaxed|slim": 0.6,
  "regular|relaxed": 0.5,
  "relaxed|regular": 0.5,
  "slim|oversized": 0.7,
  "oversized|slim": 0.7,
  "relaxed|oversized": -0.1,
  "oversized|relaxed": -0.1,
  "oversized|oversized": -0.4,
};

export const silhouetteRule: Rule = (items, rc) => {
  const top = items.find((g) => g.attrs.slot === "top");
  const bottom = items.find((g) => g.attrs.slot === "bottom");
  if (!top || !bottom) {
    // Dress-led outfit: no pairing decision.
    return { score: items.some((g) => g.attrs.slot === "dress") ? 0.3 : 0, text: "single-piece silhouette" };
  }
  const key = `${top.attrs.fit}|${bottom.attrs.fit}`;
  let s = SILHOUETTE_SCORE[key] ?? 0;
  if (key === "slim|slim") {
    // slim+slim is intentional for office/gym, loose elsewhere.
    s = rc.context.occasion === "office" || rc.context.occasion === "gym" ? 0.3 : 0.0;
  }
  const text =
    top.attrs.fit === bottom.attrs.fit
      ? `both ${top.attrs.fit}`
      : `${top.attrs.fit} top balances ${bottom.attrs.fit} bottom`;
  return { score: s, text };
};

// ---------------------------------------------------------------------------
// 5. Pattern discipline
// ---------------------------------------------------------------------------

export const patternRule: Rule = (items, rc) => {
  const dominant = items.filter((g) => g.attrs.pattern !== "solid" && (SLOT_MASS[g.attrs.slot] ?? 0) >= 0.6);
  if (dominant.length === 0) return { score: 0.2, text: "clean solid palette" };
  if (dominant.length === 1) return { score: 0.5, text: `one statement piece (${dominant[0]!.attrs.pattern})` };
  // Two+ patterned items: they must share a base color.
  const pa = dominant[0]!;
  let shared = false;
  for (const other of dominant.slice(1)) {
    if (other.attrs.colors.some((c) => pa.attrs.colors.includes(c))) shared = true;
  }
  let s = shared ? 0.1 : -0.3;
  s += 0.2 * rc.prefs.patternMixing; // personal tolerance
  if (dominant.length > 2) s -= 0.3;
  return { score: s, text: shared ? "patterned pieces share a color" : "patterns compete" };
};

// ---------------------------------------------------------------------------
// 6. Weather fit
// ---------------------------------------------------------------------------

export const weatherRule: Rule = (items, rc) => {
  const { tempC, isRaining } = rc.context.weather;
  let s = 0;
  const notes: string[] = [];
  const hasOuter = items.some((g) => g.attrs.slot === "outerwear");
  const materials = items.map((g) => g.attrs.material);

  if (tempC < 5) {
    if (hasOuter) {
      s += 0.5;
      notes.push("layered for cold");
    } else {
      s -= 0.8;
      notes.push("no outerwear for freezing temp");
    }
    if (materials.includes("light") && !hasOuter) s -= 0.2;
  } else if (tempC < 13) {
    if (hasOuter) {
      s += 0.25;
      notes.push("outerwear on standby");
    } else if (materials.includes("medium") || materials.includes("heavy")) {
      s += 0.15;
      notes.push("warm enough fabrics");
    } else {
      s -= 0.15;
      notes.push("might run cold");
    }
  } else if (tempC < 19) {
    if (hasOuter) {
      s += 0.1;
      notes.push("light layer available");
    } else {
      s += 0.1;
    }
  } else if (tempC < 27) {
    if (hasOuter) {
      s -= 0.1;
      notes.push("outerwear likely unneeded");
    } else {
      s += 0.2;
      notes.push("temp just right");
    }
  } else {
    if (materials.every((m) => m === "light")) {
      s += 0.3;
      notes.push("breathable fabrics");
    } else if (materials.includes("heavy")) {
      s -= 0.4;
      notes.push("heavy fabric for hot day");
    } else {
      s += 0.1;
    }
  }

  if (isRaining && !hasOuter) {
    s -= 0.3;
    notes.push("no rain cover");
  } else if (isRaining && hasOuter) {
    s += 0.2;
    notes.push("covered for rain");
  }

  return { score: s, text: notes.join(" · ") || "weather fit" };
};

// ---------------------------------------------------------------------------
// 7. Rotation & recency
// ---------------------------------------------------------------------------

const COOLDOWN_HOURS: Record<string, number> = {
  top: 48,
  bottom: 48,
  dress: 72,
  outerwear: 96,
  shoes: 48,
  accessory: 24,
};

export const rotationRule: Rule = (items, rc) => {
  const now = rc.context.now;
  let s = 0;
  const notes: string[] = [];
  let inCooldown = 0;
  for (const g of items) {
    if (g.lastWornAt == null) continue;
    const cooldownMs = (COOLDOWN_HOURS[g.attrs.slot] ?? 48) * 3600_000;
    if (now - g.lastWornAt < cooldownMs) inCooldown++;
  }
  if (inCooldown > 0) {
    s -= 0.5 * inCooldown;
    notes.push(`${inCooldown} piece${inCooldown > 1 ? "s" : ""} still cooling down`);
  } else {
    s += 0.3;
    notes.push("fresh rotation");
  }
  return { score: s, text: notes.join(" · ") || "rotation ok" };
};

// ---------------------------------------------------------------------------
// 8. Preference alignment (learned vector — reweight, never hard-filter)
// ---------------------------------------------------------------------------

export const preferenceRule: Rule = (items, rc) => {
  const { colors, patterns, fits, n } = rc.prefs;
  const confidence = Math.min(1, n / 10); // full weight after 10 pick events
  if (n === 0) return { score: 0, text: "learning your style" };

  let a = 0;
  for (const g of items) {
    for (const c of g.attrs.colors) a += (colors[c] ?? 0) * 0.5;
    a += patterns[g.attrs.pattern] ?? 0;
    a += fits[g.attrs.fit] ?? 0;
  }
  const s = 0.4 * a * confidence;
  const text = a > 0.2 ? "leans toward your known taste" : a < -0.2 ? "pushes your palette a bit" : "neutral to your history";
  return { score: s, text };
};

// ---------------------------------------------------------------------------
// 9. Occasion/subtype fit (t-shirt vs button-down, shorts vs trousers)
// ---------------------------------------------------------------------------

const OCCASION_SUBTYPES: Partial<Record<Occasion, Partial<Record<string, Set<string>>>>> = {
  gym: {
    top: new Set(["t-shirt", "tank top", "sweatshirt"]),
    bottom: new Set(["shorts", "joggers"]),
    shoes: new Set(["sneakers", "running shoes"]),
  },
  beach: {
    top: new Set(["t-shirt", "tank top", "top"]),
    bottom: new Set(["shorts"]),
    shoes: new Set(["sandals", "sneakers"]),
  },
  office: {
    top: new Set(["button-down shirt", "sweater", "top"]),
    bottom: new Set(["trousers", "jeans", "skirt"]),
    shoes: new Set(["dress shoes", "flats", "heels"]),
  },
};

export const occasionRule: Rule = (items, rc) => {
  const table = OCCASION_SUBTYPES[rc.context.occasion];
  if (!table) return { score: 0, text: "occasion neutral" };

  let s = 0;
  const good: string[] = [];
  const bad: string[] = [];
  for (const g of items) {
    const allowed = table[g.attrs.slot];
    if (!allowed || !g.attrs.subtype) continue;
    if (allowed.has(g.attrs.subtype)) {
      s += 0.18;
      if (good.length < 2) good.push(g.attrs.subtype);
    } else {
      s -= 0.28;
      if (bad.length < 2) bad.push(g.attrs.subtype);
    }
  }
  s = Math.max(-0.7, Math.min(0.7, s));
  const text =
    good.length > 0
      ? `made for ${rc.context.occasion}: ${good.join(", ")}`
      : bad.length > 0
        ? `not quite ${rc.context.occasion} gear`
        : "occasion neutral";
  return { score: s, text };
};

// ---------------------------------------------------------------------------
// Rule registry & weights
// ---------------------------------------------------------------------------

export interface EngineWeights {
  color: number;
  formality: number;
  silhouette: number;
  pattern: number;
  weather: number;
  rotation: number;
  preference: number;
  occasion: number;
}

export const DEFAULT_WEIGHTS: EngineWeights = {
  color: 1.0,
  formality: 1.2,
  silhouette: 0.8,
  pattern: 0.6,
  weather: 0.9,
  rotation: 0.7,
  preference: 0.8,
  occasion: 1.0,
};

export const RULES: { name: string; weightKey: keyof EngineWeights; fn: Rule }[] = [
  { name: "color", weightKey: "color", fn: colorRule },
  { name: "formality", weightKey: "formality", fn: formalityRule },
  { name: "silhouette", weightKey: "silhouette", fn: silhouetteRule },
  { name: "pattern", weightKey: "pattern", fn: patternRule },
  { name: "weather", weightKey: "weather", fn: weatherRule },
  { name: "rotation", weightKey: "rotation", fn: rotationRule },
  { name: "preference", weightKey: "preference", fn: preferenceRule },
  { name: "occasion", weightKey: "occasion", fn: occasionRule },
];
