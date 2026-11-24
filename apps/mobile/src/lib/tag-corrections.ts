import type { Garment, GarmentAttrs } from "@styleme/schema";

type Correction = Garment["corrections"][number];

const CORRECTABLE_FIELDS = [
  "slot",
  "colors",
  "pattern",
  "fit",
  "formality",
  "season",
  "material",
  "subtype",
  "nickname",
] as const;

type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

const SLOTS = new Set(["top", "bottom", "dress", "outerwear", "shoes", "accessory"]);
const PATTERNS = new Set(["solid", "striped", "check", "floral", "graphic", "animal", "other"]);
const FITS = new Set(["slim", "regular", "relaxed", "oversized"]);
const SEASONS = new Set(["warm", "cool", "all"]);
const MATERIALS = new Set(["light", "medium", "heavy"]);

function fieldValue(attrs: GarmentAttrs, field: CorrectableField): string {
  if (field === "colors") return attrs.colors.join(",");
  if (field === "formality") return String(attrs.formality);
  if (field === "subtype") return attrs.subtype ?? "";
  if (field === "nickname") return attrs.nickname ?? "";
  return String(attrs[field]);
}

/** Diff two tag drafts into append-only correction records. */
export function diffCorrections(
  before: GarmentAttrs,
  after: GarmentAttrs,
  at = Date.now(),
): Correction[] {
  const out: Correction[] = [];
  for (const field of CORRECTABLE_FIELDS) {
    const from = fieldValue(before, field);
    const to = fieldValue(after, field);
    if (from !== to) out.push({ field, from, to, at });
  }
  return out;
}

/** Apply user corrections after model inference. Latest correction per field wins. */
export function applyCorrections(attrs: GarmentAttrs, corrections: Correction[]): GarmentAttrs {
  if (corrections.length === 0) return attrs;
  const next: GarmentAttrs = { ...attrs, colors: [...attrs.colors] };
  const ordered = [...corrections].sort((a, b) => a.at - b.at);
  for (const c of ordered) {
    switch (c.field) {
      case "slot":
        if (SLOTS.has(c.to)) next.slot = c.to as GarmentAttrs["slot"];
        break;
      case "colors": {
        const colors = c.to.split(",").filter(Boolean) as GarmentAttrs["colors"];
        if (colors.length > 0) next.colors = colors;
        break;
      }
      case "pattern":
        if (PATTERNS.has(c.to)) next.pattern = c.to as GarmentAttrs["pattern"];
        break;
      case "fit":
        if (FITS.has(c.to)) next.fit = c.to as GarmentAttrs["fit"];
        break;
      case "formality": {
        const n = Number.parseInt(c.to, 10);
        if (Number.isFinite(n)) {
          next.formality = Math.max(1, Math.min(5, n)) as GarmentAttrs["formality"];
        }
        break;
      }
      case "season":
        if (SEASONS.has(c.to)) next.season = c.to as GarmentAttrs["season"];
        break;
      case "material":
        if (MATERIALS.has(c.to)) next.material = c.to as GarmentAttrs["material"];
        break;
      case "subtype":
        next.subtype = c.to || undefined;
        break;
      case "nickname":
        next.nickname = c.to || undefined;
        break;
    }
  }
  return next;
}
