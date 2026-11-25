/**
 * Shop-the-gap — pure, text-only wardrobe gap analysis.
 *
 * No commerce, no network: this only turns wardrobe attributes into a short
 * ranked list of "what to add next". Deterministic for a given wardrobe.
 */
import type { Garment, GarmentAttrs, Slot } from "@styleme/schema";
import { isNeutral } from "./color";

export interface WardrobeGap {
  /** Stable id for keys/tests. */
  id: string;
  title: string;
  why: string;
  /** Higher first; ties broken by id for determinism. */
  priority: number;
}

const MAX_GAPS = 5;

function bySlot(wardrobe: Garment[]): Map<Slot, Garment[]> {
  const map = new Map<Slot, Garment[]>();
  for (const g of wardrobe) {
    if (g.status === "retired") continue;
    const list = map.get(g.attrs.slot) ?? [];
    list.push(g);
    map.set(g.attrs.slot, list);
  }
  return map;
}

function isWarmLayer(attrs: GarmentAttrs): boolean {
  return attrs.season !== "warm" && attrs.material !== "light";
}

function isWarmWeather(attrs: GarmentAttrs): boolean {
  return attrs.season === "warm" || attrs.season === "all";
}

function isOfficeShoe(attrs: GarmentAttrs): boolean {
  return attrs.formality >= 3;
}

/**
 * Rank the most useful additions to a wardrobe, max 5.
 *
 * Ordering is priority first, then id; no clock, RNG, or I/O, so the same
 * wardrobe always returns the same list.
 */
export function gapAnalysis(wardrobe: Garment[]): WardrobeGap[] {
  const slots = bySlot(wardrobe);
  const items = [...slots.values()].flat();
  const tops = slots.get("top") ?? [];
  const bottoms = slots.get("bottom") ?? [];
  const dresses = slots.get("dress") ?? [];
  const shoes = slots.get("shoes") ?? [];
  const outerwear = slots.get("outerwear") ?? [];
  const accessories = slots.get("accessory") ?? [];
  const hasDress = dresses.length > 0;
  const gaps: WardrobeGap[] = [];

  const add = (id: string, title: string, why: string, priority: number) => {
    gaps.push({ id, title, why, priority });
  };

  if (items.length === 0) {
    return [
      {
        id: "core",
        title: "The core three",
        why: "Start with a top, a bottom, and shoes — everything else builds from there.",
        priority: 100,
      },
    ];
  }

  if (shoes.length === 0) {
    add(
      "shoes",
      "Shoes to finish the look",
      "Every complete outfit needs shoes, and your wardrobe has none yet.",
      100,
    );
  }
  if (!hasDress && tops.length === 0) {
    add(
      "top",
      "A top to build around",
      "You have bottoms but no top — the engine still cannot complete an outfit.",
      96,
    );
  }
  if (!hasDress && bottoms.length === 0) {
    add(
      "bottom",
      "A bottom to build around",
      "You have tops but no bottom — the engine still cannot complete an outfit.",
      96,
    );
  }

  if (outerwear.length === 0) {
    add(
      "warm-layer",
      "A warm layer",
      "No coat or jacket yet — cold days will fall back to lighter pieces.",
      80,
    );
  } else if (!outerwear.some((g) => isWarmLayer(g.attrs))) {
    add(
      "warm-layer",
      "A properly warm layer",
      "Your outerwear is all light or warm-weather — nothing covers a cold morning.",
      78,
    );
  }

  if (bottoms.length === 1) {
    add(
      "bottom-depth",
      "A second bottom",
      "One bottom is carrying every outfit; a second doubles your rotation.",
      68,
    );
  }
  if (tops.length === 1) {
    add(
      "top-depth",
      "A second top",
      "One top limits every rotation; a second gives the engine a real choice.",
      52,
    );
  }
  if (shoes.length === 1) {
    add(
      "shoe-depth",
      "A second pair of shoes",
      "One pair is doing every job; a second unlocks weather and formality range.",
      60,
    );
  }

  if (shoes.length > 0 && !shoes.some((g) => isOfficeShoe(g.attrs))) {
    add(
      "office-shoe",
      "A shoe that works for the office",
      "Your shoes are casual-only — nothing clears the office formality band.",
      72,
    );
  }

  if (items.every((g) => g.attrs.formality <= 3)) {
    add(
      "dressed-up",
      "One dressed-up piece",
      "Nothing clears formality 3, so office and date looks will stay limited.",
      58,
    );
  }

  if (!items.some((g) => isWarmWeather(g.attrs))) {
    add(
      "warm-weather",
      "A warm-weather piece",
      "Everything you own is cool-season; hot days will be thin on options.",
      44,
    );
  }

  if (items.length >= 3 && !items.some((g) => g.attrs.colors.some((c) => !isNeutral(c)))) {
    add(
      "color",
      "One piece with color",
      "Everything you own is a neutral — one rust or blue piece changes the palette.",
      30,
    );
  }

  if (accessories.length === 0 && items.length >= 3) {
    add(
      "accessory",
      "One finishing piece",
      "A belt, bag, or scarf adds a layer without needing a whole new outfit.",
      22,
    );
  }

  return gaps
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, MAX_GAPS);
}
