/**
 * Color theory core. First principles, no ML.
 *
 * 16 curated palette names (see @styleme/schema) with HSL anchors.
 * 7 of them behave as NEUTRALS in style rules (black, white, cream,
 * grey, navy, tan, brown) — navy/tan/brown are "power neutrals" per
 * standard styling doctrine.
 */
import type { ColorName } from "@styleme/schema";

export interface ColorDef {
  name: ColorName;
  /** Hue in degrees (0..360). Meaningless for achromatic. */
  h: number;
  /** Saturation 0..1. */
  s: number;
  /** Lightness 0..1. */
  l: number;
  /** True when the color anchors a palette instead of competing in it. */
  neutral: boolean;
  /** Warm/cool temperature. Neutrals default cool but are exempt. */
  temp: "warm" | "cool";
}

export const PALETTE: Record<ColorName, ColorDef> = {
  black: { name: "black", h: 0, s: 0, l: 0.06, neutral: true, temp: "cool" },
  white: { name: "white", h: 0, s: 0, l: 0.97, neutral: true, temp: "cool" },
  cream: { name: "cream", h: 45, s: 0.55, l: 0.92, neutral: true, temp: "warm" },
  grey: { name: "grey", h: 0, s: 0, l: 0.5, neutral: true, temp: "cool" },
  navy: { name: "navy", h: 220, s: 0.6, l: 0.2, neutral: true, temp: "cool" },
  tan: { name: "tan", h: 35, s: 0.45, l: 0.65, neutral: true, temp: "warm" },
  brown: { name: "brown", h: 25, s: 0.4, l: 0.3, neutral: true, temp: "warm" },
  red: { name: "red", h: 0, s: 0.75, l: 0.45, neutral: false, temp: "warm" },
  orange: { name: "orange", h: 28, s: 0.8, l: 0.55, neutral: false, temp: "warm" },
  yellow: { name: "yellow", h: 48, s: 0.85, l: 0.55, neutral: false, temp: "warm" },
  green: { name: "green", h: 130, s: 0.45, l: 0.38, neutral: false, temp: "cool" },
  teal: { name: "teal", h: 185, s: 0.55, l: 0.35, neutral: false, temp: "cool" },
  blue: { name: "blue", h: 215, s: 0.7, l: 0.45, neutral: false, temp: "cool" },
  purple: { name: "purple", h: 270, s: 0.45, l: 0.42, neutral: false, temp: "cool" },
  pink: { name: "pink", h: 340, s: 0.6, l: 0.7, neutral: false, temp: "warm" },
  rust: { name: "rust", h: 18, s: 0.6, l: 0.42, neutral: false, temp: "warm" },
};

export function isNeutral(c: ColorName): boolean {
  return PALETTE[c]?.neutral ?? false;
}

/** Circular hue distance in degrees, 0..180. */
export function hueDistance(a: ColorName, b: ColorName): number {
  const da = PALETTE[a]!;
  const db = PALETTE[b]!;
  if (da.s < 0.05 || db.s < 0.05) return 0;
  const d = Math.abs(da.h - db.h) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Mass weight per slot: how much an item "talks" in an outfit.
 * A pair of shoes is an accent, a top is a statement.
 */
export const SLOT_MASS: Record<string, number> = {
  top: 1.0,
  bottom: 1.0,
  dress: 1.4,
  outerwear: 0.8,
  shoes: 0.4,
  accessory: 0.3,
};

export interface ColorHarmonyResult {
  score: number;
  text: string;
  /** True when a personal neverMix rule was violated (hard). */
  neverMixViolation: [ColorName, ColorName] | null;
}

/**
 * Score the color story of an outfit.
 *
 * Principles (each contributes a labeled score):
 *  - ≤3 non-neutral colors (60-30-10). Soft cap: if the wardrobe simply
 *    has no neutrals, we relax to 4 instead of returning nothing.
 *  - Color temperature: warm-with-warm, cool-with-cool. Mixing is a
 *    small penalty, not a ban (denim + rust is a classic).
 *  - Complementary clash: high-mass items ~180° apart penalized; the
 *    same clash on an accent slot (shoes/belt) is a deliberate-pop bonus.
 *  - Tonal layering (same hue family across items) bonus.
 *  - All-neutral monochrome bonus.
 *
 * @param colors        All color names across the outfit's items.
 * @param slotByColor   For each color, the mass of the biggest item wearing it.
 * @param neverMix      Personal hard rules.
 * @param wardrobeHasNeutral  Does the user own any neutral item at all?
 */
export function colorHarmony(
  colors: ColorName[],
  slotByColor: Record<string, number>,
  neverMix: [ColorName, ColorName][] = [],
  wardrobeHasNeutral: boolean = true,
): ColorHarmonyResult {
  const unique = [...new Set(colors)] as ColorName[];
  let score = 0;
  const notes: string[] = [];

  // --- personal never-mix rules (hard) ---------------------------------
  for (const [a, b] of neverMix) {
    if (unique.includes(a) && unique.includes(b)) {
      return {
        score: -Infinity,
        text: `You asked us to never mix ${a} and ${b}.`,
        neverMixViolation: [a, b],
      };
    }
  }

  // --- 60-30-10: non-neutral count ---------------------------------------
  const chromatic = unique.filter((c) => !isNeutral(c));
  const maxChromatic = wardrobeHasNeutral ? 3 : 4;
  if (chromatic.length <= 2) {
    score += 1.0;
    notes.push(chromatic.length === 0 ? "monochrome anchor" : "clean color count");
  } else if (chromatic.length === maxChromatic) {
    score += 0.55;
    notes.push("full 3-color palette (60-30-10)");
  } else if (chromatic.length === maxChromatic + 1) {
    score -= 0.15;
    notes.push("color count slightly busy");
  } else {
    score -= 0.4;
    notes.push("too many colors competing");
  }

  // --- temperature mix ----------------------------------------------------
  const warm = chromatic.filter((c) => PALETTE[c]!.temp === "warm");
  const cool = chromatic.filter((c) => PALETTE[c]!.temp === "cool");
  if (warm.length > 0 && cool.length > 0) {
    // A single accent-side exception: if the minor temperature side has
    // low total mass (≤0.6), it reads as deliberate contrast.
    const warmMass = sumMass(warm, slotByColor);
    const coolMass = sumMass(cool, slotByColor);
    const minorMass = Math.min(warmMass, coolMass);
    if (minorMass <= 0.6) {
      score += 0.0; // neutral read, no penalty
      notes.push("warm/cool mix held as accent");
    } else {
      score -= 0.15;
      notes.push("warm and cool colors mixed");
    }
  }

  // --- complementary clash (high mass vs high mass) ------------------------
  let clashing = false;
  let accentPop = false;
  for (let i = 0; i < chromatic.length; i++) {
    for (let j = i + 1; j < chromatic.length; j++) {
      const a = chromatic[i]!;
      const b = chromatic[j]!;
      const d = hueDistance(a, b);
      if (d >= 150 && d <= 210) {
        const massA = slotByColor[a] ?? 0;
        const massB = slotByColor[b] ?? 0;
        const minorMass = Math.min(massA, massB);
        if (minorMass >= 0.75) clashing = true;
        else accentPop = true;
      }
    }
  }
  if (clashing) {
    score -= 0.25;
    notes.push("clashing complementary pair");
  } else if (accentPop) {
    score += 0.1;
    notes.push("complementary accent pop");
  }

  // --- tonal layering bonus -------------------------------------------------
  const hueFamilies = new Set(chromatic.map((c) => familyOf(c)));
  const sharedFamily = chromatic.length >= 2 && hueFamilies.size < chromatic.length;
  if (sharedFamily) {
    score += 0.1;
    notes.push("tonal layering");
  }

  // --- all neutral -----------------------------------------------------------
  if (chromatic.length === 0 && unique.length > 0) {
    score += 0.15;
    notes.push("all-neutral monochrome");
  }

  return { score, text: notes.join(" · "), neverMixViolation: null };
}

/** Coarse hue family: 45° buckets around the wheel (achromatic → "neutral"). */
function familyOf(c: ColorName): string {
  const def = PALETTE[c]!;
  if (def.s < 0.05) return "neutral";
  return `${Math.round(def.h / 45) * 45}deg`;
}

function sumMass(colors: ColorName[], slotByColor: Record<string, number>): number {
  return colors.reduce((sum, c) => sum + (slotByColor[c] ?? 0), 0);
}
