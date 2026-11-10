/**
 * On-device garment tagging.
 *
 * Production path (after Colab notebook 01 ships its bundle):
 *   1. MobileCLIP-S0 TFLite (image tower) → 512-d embedding
 *   2. cosine(embedding, prompt_embeddings) → zero-shot attribute labels
 *   3. optional linear probes (probes.json) override weak attributes
 *
 * The TFLite runtime for React Native is @tensorflow/tfjs-react-native
 * (native module → needs a dev build / EAS, not Expo Go). See
 * src/vision/README.md for the exact wiring.
 *
 * Until the bundle + dev build exist, `mockTagger` keeps the whole product
 * loop working end-to-end (capture → tags → engine → learning). Mock tags
 * are deterministic per photo so the UI is stable across re-renders.
 */
import type { GarmentAttrs } from "@styleme/schema";

export interface VisionTagger {
  /** uri: camera capture uri. Returns best-guess attrs (user confirms/corrects). */
  tag(uri: string): Promise<GarmentAttrs>;
  readonly name: string;
}

const SLOTS = ["top", "bottom", "dress", "shoes", "outerwear", "accessory"] as const;
const COLORS = [
  "black", "white", "cream", "grey", "navy", "tan", "brown",
  "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "rust",
] as const;
const PATTERNS = ["solid", "solid", "solid", "striped", "check", "floral", "graphic"] as const;
const FITS = ["slim", "regular", "regular", "relaxed", "oversized"] as const;
const SEASONS = ["warm", "cool", "all", "all", "all"] as const;
const MATERIALS = ["light", "medium", "medium", "heavy"] as const;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Deterministic pseudo-tagger. Replace with TFLiteTagger when the bundle lands. */
export const mockTagger: VisionTagger = {
  name: "mock",
  async tag(uri: string): Promise<GarmentAttrs> {
    const rng = mulberry32(hash(uri));
    const c1 = pick(rng, COLORS);
    const two = rng() < 0.35;
    let c2 = pick(rng, COLORS);
    if (two && c2 === c1) c2 = pick(rng, COLORS);
    const slot = pick(rng, SLOTS);
    return {
      slot,
      colors: two ? [c1, c2] : [c1],
      pattern: pick(rng, PATTERNS),
      fit: pick(rng, FITS),
      formality: 1 + Math.floor(rng() * 5),
      season: pick(rng, SEASONS),
      material: pick(rng, MATERIALS),
    };
  },
};

let active: VisionTagger = mockTagger;

/** Swap in the real tagger once the TFLite bundle is wired up. */
export function setVisionTagger(t: VisionTagger): void {
  active = t;
}

export function getVisionTagger(): VisionTagger {
  return active;
}
