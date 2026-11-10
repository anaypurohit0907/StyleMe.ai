/**
 * Test fixtures: deterministic pseudo-wardrobes.
 */
import type { Garment, GarmentAttrs, Occasion, RecommendContext } from "@styleme/schema";
import { hashSeed, mulberry32 } from "../src/explore";

const SLOTS = ["top", "bottom", "dress", "shoes", "outerwear", "accessory"] as const;
const COLORS = [
  "black", "white", "cream", "grey", "navy", "tan", "brown",
  "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "rust",
] as const;
const PATTERNS = ["solid", "striped", "check", "floral", "graphic"] as const;
const FITS = ["slim", "regular", "relaxed", "oversized"] as const;
const SEASONS = ["warm", "cool", "all"] as const;
const MATERIALS = ["light", "medium", "heavy"] as const;

export interface WardrobeSpec {
  seed: number;
  items?: number;
  /** Force a specific slot count per item for controlled tests. */
  slotPlan?: Record<string, number>;
  neutralsOnly?: boolean;
}

export function makeWardrobe(spec: WardrobeSpec): Garment[] {
  const rng = mulberry32(spec.seed >>> 0);
  const slotPlan = spec.slotPlan ?? {
    top: 8,
    bottom: 6,
    dress: 3,
    shoes: 5,
    outerwear: 3,
    accessory: 3,
  };
  const out: Garment[] = [];
  let i = 0;
  for (const [slot, count] of Object.entries(slotPlan)) {
    for (let k = 0; k < count; k++) {
      const colorPool = spec.neutralsOnly
        ? (["black", "white", "cream", "grey", "navy", "tan", "brown"] as const)
        : COLORS;
      const c1 = colorPool[Math.floor(rng() * colorPool.length)]!;
      let c2: (typeof COLORS)[number] | undefined;
      if (rng() < 0.35) c2 = colorPool[Math.floor(rng() * colorPool.length)]!;
      const formality = slot === "shoes" ? 1 + Math.floor(rng() * 5) : 1 + Math.floor(rng() * 5);
      const attrs: GarmentAttrs = {
        slot: slot as GarmentAttrs["slot"],
        colors: c2 && c2 !== c1 ? [c1, c2] : [c1],
        pattern: PATTERNS[Math.floor(rng() * PATTERNS.length)]!,
        fit: FITS[Math.floor(rng() * FITS.length)]!,
        formality,
        season: SEASONS[Math.floor(rng() * SEASONS.length)]!,
        material: MATERIALS[Math.floor(rng() * MATERIALS.length)]!,
      };
      out.push({
        id: `g${i++}`,
        attrs,
        status: "available",
        photoRef: `local://g${i}`,
        addedAt: Date.UTC(2026, 10, 1),
        lastWornAt: null,
        corrections: [],
      });
    }
  }
  return out;
}

export function makeContext(partial?: {
  occasion?: Occasion;
  tempC?: number;
  isRaining?: boolean;
  now?: number;
  mood?: "high" | "chill" | "focused" | "tired" | "none";
}): RecommendContext {
  return {
    occasion: partial?.occasion ?? "casual",
    mood: partial?.mood ?? "none",
    weather: {
      tempC: partial?.tempC ?? 20,
      isRaining: partial?.isRaining ?? false,
    },
    now: partial?.now ?? Date.UTC(2026, 10, 9, 8),
  };
}

/** Deterministic "user pick" simulator: picks index k%len from offered. */
export function pickIndex(len: number, day: number, userSalt: number): number {
  if (len === 0) return -1;
  return Math.floor(mulberry32(hashSeed(`user${userSalt}:day${day}`) >>> 0)() * len);
}
