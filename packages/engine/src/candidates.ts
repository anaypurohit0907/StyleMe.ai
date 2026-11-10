/**
 * Candidate outfit generation: slot completion over the wearable wardrobe.
 *
 * Outfit shapes (completeness doctrine):
 *   A: top + bottom + shoes
 *   B: dress + shoes
 *   Optional add-ons (chosen during scoring): + outerwear, + 1 accessory
 *
 * Hard filters applied here (before scoring):
 *   - status retired / in_wash / in_use items are excluded
 *   - season mismatch vs temperature band
 *
 * Generation is bounded: per-slot fan-out and total candidates are capped
 * so the engine stays fast even with a 200-item wardrobe.
 */
import type { Garment, WeatherContext } from "@styleme/schema";

export interface Candidate {
  garmentIds: string[];
  /** Fast precomputed view for the rule scorers. */
  items: Garment[];
}

export interface CandidateStats {
  considered: number;
  droppedByStatus: number;
  droppedBySeason: number;
}

export interface CandidateResult {
  candidates: Candidate[];
  stats: CandidateStats;
  /** Optional add-ons the scorer may attach to a base outfit. */
  options: { outerwear: Garment[]; accessories: Garment[] };
}

const MAX_PER_SLOT = 12;
const MAX_TOTAL = 400;

/** Which seasons are acceptable for the current temperature. */
export function acceptableSeasons(weather: WeatherContext): Set<string> {
  const { tempC } = weather;
  if (tempC <= 8) return new Set(["cool", "all"]);
  if (tempC >= 26) return new Set(["warm", "all"]);
  return new Set(["warm", "cool", "all"]);
}

export function isWearable(g: Garment, weather: WeatherContext): boolean {
  if (g.status !== "available") return false;
  return acceptableSeasons(weather).has(g.attrs.season);
}

export function generateCandidates(
  wardrobe: Garment[],
  weather: WeatherContext,
): CandidateResult {
  const seasons = acceptableSeasons(weather);

  let available = 0;
  let droppedBySeason = 0;
  const bySlot = new Map<string, Garment[]>();

  for (const g of wardrobe) {
    if (g.status !== "available") continue;
    available++;
    if (!seasons.has(g.attrs.season)) {
      droppedBySeason++;
      continue;
    }
    const list = bySlot.get(g.attrs.slot) ?? [];
    list.push(g);
    bySlot.set(g.attrs.slot, list);
  }

  const tops = (bySlot.get("top") ?? []).slice(0, MAX_PER_SLOT);
  const bottoms = (bySlot.get("bottom") ?? []).slice(0, MAX_PER_SLOT);
  const dresses = (bySlot.get("dress") ?? []).slice(0, MAX_PER_SLOT);
  const shoes = (bySlot.get("shoes") ?? []).slice(0, MAX_PER_SLOT);
  const outerwear = (bySlot.get("outerwear") ?? []).slice(0, MAX_PER_SLOT);
  const accessories = (bySlot.get("accessory") ?? []).slice(0, MAX_PER_SLOT);

  const candidates: Candidate[] = [];
  const push = (items: Garment[]) => {
    if (candidates.length >= MAX_TOTAL) return;
    candidates.push({ garmentIds: items.map((g) => g.id), items });
  };

  // Shape A: top + bottom + shoes
  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        push([top, bottom, shoe]);
      }
    }
  }

  // Shape B: dress + shoes
  for (const dress of dresses) {
    for (const shoe of shoes) {
      push([dress, shoe]);
    }
  }

  return {
    candidates,
    stats: {
      considered: wardrobe.length,
      droppedByStatus: wardrobe.length - available,
      droppedBySeason,
    },
    options: { outerwear, accessories },
  };
}
