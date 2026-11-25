/**
 * Real on-device tagger: MobileCLIP-S1 (ONNX) + prompt embeddings + probes.
 *
 * Requires a dev build (onnxruntime-react-native is a native module). The mock
 * tagger remains the fallback so the product loop works in Expo Go.
 */
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import jpeg from "jpeg-js";
import type { ColorName, Fit, GarmentAttrs, Pattern, Slot } from "@styleme/schema";
import { paletteSwatch } from "@styleme/design";
import { decodePngRgba } from "./png";
import { errorText, log, logError, logWarn } from "./pipeline-log";
import { mockTagger, type VisionTagger } from "./vision";

type OrtModule = typeof import("onnxruntime-react-native");
let ortModule: OrtModule | null = null;
function ort(): OrtModule {
  if (!ortModule) ortModule = require("onnxruntime-react-native") as OrtModule;
  return ortModule;
}

const SIZE = 256;
const SUBTYPE_SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

interface Probe {
  labels: string[];
  W: number[][];
  b: number[];
  acc?: number;
}

interface PromptFile {
  dim: number;
  vectors: number[][];
}

interface TaxonomyFile {
  prompts: string[];
}

const prompts = require("../../assets/vision/prompt_embeddings.json") as PromptFile;
const taxonomy = require("../../assets/vision/taxonomy.json") as TaxonomyFile;
const probes = require("../../assets/vision/probes.json") as Record<string, Probe>;
const subtypeMeta = require("../../assets/vision/subtype_mobilenet.json") as {
  labels: string[];
  slot_by_label: Record<string, string>;
};
const slotMeta = require("../../assets/vision/slot_background_aug.json") as { labels: string[] };

function groupRows(group: string): { values: string[]; rows: number[][] } {
  const values: string[] = [];
  const rows: number[][] = [];
  taxonomy.prompts.forEach((p, i) => {
    const [g, v] = p.split(":");
    if (g === group && v) {
      values.push(v);
      rows.push(prompts.vectors[i]!);
    }
  });
  return { values, rows };
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

function normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

function topLabels(logits: number[], labels: string[], k = 3): string {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return logits
    .map((_, i) => i)
    .sort((a, b) => (logits[b] ?? 0) - (logits[a] ?? 0))
    .slice(0, k)
    .map((i) => `${labels[i] ?? i}=${((exps[i] ?? 0) / sum).toFixed(2)}`)
    .join(" ");
}

function softmaxProb(logits: number[], index: number): number {
  const max = Math.max(...logits);
  let sum = 0;
  for (const x of logits) sum += Math.exp(x - max);
  if (sum === 0) return 0;
  return Math.exp((logits[index] ?? 0) - max) / sum;
}

function zeroShot(embedding: number[], group: string): string | null {
  const { values, rows } = groupRows(group);
  if (rows.length === 0) return null;
  let best = -Infinity;
  let label: string | null = null;
  rows.forEach((r, i) => {
    const s = dot(embedding, r);
    if (s > best) {
      best = s;
      label = values[i]!;
    }
  });
  return label;
}

function applyProbe(embedding: number[], group: string): string | null {
  const p = probes[group];
  if (!p) return null;
  let best = -Infinity;
  let label: string | null = null;
  p.W.forEach((row, i) => {
    const s = dot(row, embedding) + (p.b[i] ?? 0);
    if (s > best) {
      best = s;
      label = p.labels[i] ?? null;
    }
  });
  return label;
}

const PALETTE_RGB = Object.entries(paletteSwatch).map(([name, hex]) => {
  const n = parseInt(hex.slice(1), 16);
  return { name, r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
});

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface RgbaImage {
  data: Uint8Array;
  width: number;
  height: number;
  /** True for cutout PNGs; false for camera JPEG fallbacks. */
  hasAlpha: boolean;
  /** Opaque-pixel bounds, null when there is no meaningful alpha. */
  box: Box | null;
}

function opaqueBox(src: Uint8Array, w: number, h: number): Box | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  let count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((src[(y * w + x) * 4 + 3] ?? 0) > 24) {
        count++;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  // A few stray pixels are not a garment; use the full frame instead.
  if (x1 < 0 || count < w * h * 0.005) return null;
  return { x0, y0, x1, y1 };
}

function median(values: number[]): number {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

/** Median color of the garment -> nearest palette anchor. Alpha-aware. */
function dominantColor(img: RgbaImage): ColorName {
  const { data: src, width: w, height: h, hasAlpha, box } = img;
  let x0 = Math.floor(w * 0.2);
  let x1 = Math.floor(w * 0.8);
  let y0 = Math.floor(h * 0.2);
  let y1 = Math.floor(h * 0.8);
  if (hasAlpha && box) {
    x0 = box.x0;
    y0 = box.y0;
    x1 = box.x1 + 1;
    y1 = box.y1 + 1;
  }
  const area = Math.max(1, (x1 - x0) * (y1 - y0));
  const step = Math.max(1, Math.floor(Math.sqrt(area / 4096)));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * w + x) * 4;
      if (hasAlpha && (src[i + 3] ?? 0) < 200) continue;
      rs.push(src[i] ?? 0);
      gs.push(src[i + 1] ?? 0);
      bs.push(src[i + 2] ?? 0);
    }
  }
  if (rs.length === 0) {
    const i = (Math.floor(h / 2) * w + Math.floor(w / 2)) * 4;
    rs.push(src[i] ?? 0);
    gs.push(src[i + 1] ?? 0);
    bs.push(src[i + 2] ?? 0);
  }
  const [r, g, b] = [median(rs), median(gs), median(bs)];
  let best = PALETTE_RGB[0]!;
  let bestD = Infinity;
  for (const p of PALETTE_RGB) {
    const d = (p.r - r) ** 2 + (p.g - g) ** 2 + (p.b - b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.name as ColorName;
}

/** Stretch a full frame to a square model input (JPEG fallback path). */
function resizeRgba(src: Uint8Array, sw: number, sh: number, size: number): Float32Array {
  const out = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let y = 0; y < size; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / size));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / size));
      const si = (sy * sw + sx) * 4;
      const di = y * size + x;
      out[di] = ((src[si] ?? 0) / 255 - MEAN[0]!) / STD[0]!;
      out[plane + di] = ((src[si + 1] ?? 0) / 255 - MEAN[1]!) / STD[1]!;
      out[2 * plane + di] = ((src[si + 2] ?? 0) / 255 - MEAN[2]!) / STD[2]!;
    }
  }
  return out;
}

/**
 * Square, white-background, bbox-centered garment crop for the product-trained
 * heads. The flat-lay model never saw a grey bed-sized canvas; feeding it one
 * was the main reason slot predictions collapsed to bottom/accessory.
 */
function garmentInput(img: RgbaImage, size: number): Float32Array {
  if (!img.hasAlpha || !img.box) return resizeRgba(img.data, img.width, img.height, size);
  const { data, width: w, height: h, box } = img;
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const side = Math.max(16, Math.max(bw, bh) * 1.08);
  const cx = (box.x0 + box.x1 + 1) / 2;
  const cy = (box.y0 + box.y1 + 1) / 2;
  const left = cx - side / 2;
  const top = cy - side / 2;
  const out = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let y = 0; y < size; y++) {
    const fy = top + ((y + 0.5) * side) / size;
    for (let x = 0; x < size; x++) {
      const fx = left + ((x + 0.5) * side) / size;
      let r = 255;
      let g = 255;
      let b = 255;
      if (fx >= 0 && fy >= 0 && fx < w && fy < h) {
        const si = (Math.floor(fy) * w + Math.floor(fx)) * 4;
        const a = (data[si + 3] ?? 0) / 255;
        r = (data[si] ?? 0) * a + 255 * (1 - a);
        g = (data[si + 1] ?? 0) * a + 255 * (1 - a);
        b = (data[si + 2] ?? 0) * a + 255 * (1 - a);
      }
      const di = y * size + x;
      out[di] = (r / 255 - MEAN[0]!) / STD[0]!;
      out[plane + di] = (g / 255 - MEAN[1]!) / STD[1]!;
      out[2 * plane + di] = (b / 255 - MEAN[2]!) / STD[2]!;
    }
  }
  return out;
}

async function decode(uri: string): Promise<RgbaImage> {
  const bytes = await new File(uri).bytes();
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const png = decodePngRgba(bytes);
    return { ...png, hasAlpha: true, box: opaqueBox(png.data, png.width, png.height) };
  }
  const raw = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 });
  return { data: raw.data as Uint8Array, width: raw.width, height: raw.height, hasAlpha: false, box: null };
}

class OnnxTagger implements VisionTagger {
  readonly name = "mobileclip-s1-onnx";
  private session: Promise<import("onnxruntime-react-native").InferenceSession> | null = null;
  private subtypeSession: Promise<import("onnxruntime-react-native").InferenceSession> | null = null;
  private slotSession: Promise<import("onnxruntime-react-native").InferenceSession> | null = null;

  private load(): Promise<import("onnxruntime-react-native").InferenceSession> {
    if (!this.session) {
      this.session = (async () => {
        const asset = Asset.fromModule(require("../../assets/vision/mobileclip_s1_image.onnx"));
        await asset.downloadAsync();
        const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
        return ort().InferenceSession.create(path, { executionProviders: ["cpu"] });
      })();
    }
    return this.session;
  }

  private loadSubtype(): Promise<import("onnxruntime-react-native").InferenceSession> {
    if (!this.subtypeSession) {
      this.subtypeSession = (async () => {
        const asset = Asset.fromModule(require("../../assets/vision/subtype_mobilenet.onnx"));
        await asset.downloadAsync();
        const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
        return ort().InferenceSession.create(path, { executionProviders: ["cpu"] });
      })();
    }
    return this.subtypeSession;
  }

  private loadSlot(): Promise<import("onnxruntime-react-native").InferenceSession> {
    if (!this.slotSession) {
      this.slotSession = (async () => {
        const asset = Asset.fromModule(require("../../assets/vision/slot_background_aug.onnx"));
        await asset.downloadAsync();
        const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
        return ort().InferenceSession.create(path, { executionProviders: ["cpu"] });
      })();
    }
    return this.slotSession;
  }

  private async classifySlot(img: RgbaImage): Promise<{ label: Slot; confidence: number } | undefined> {
    const start = Date.now();
    log("tag", "slot model start");
    const session = await this.loadSlot();
    const input = garmentInput(img, SUBTYPE_SIZE);
    const tensor = new (ort().Tensor)("float32", input, [1, 3, SUBTYPE_SIZE, SUBTYPE_SIZE]);
    const out = await session.run({ pixels: tensor });
    const logits = Array.from(Object.values(out)[0].data as Float32Array);
    let best = 0;
    for (let i = 1; i < logits.length; i++) if (logits[i]! > logits[best]!) best = i;
    const label = slotMeta.labels[best];
    const confidence = softmaxProb(logits, best);
    log(
      "tag",
      `slot model -> ${label ?? "none"} conf=${confidence.toFixed(2)} [${topLabels(logits, slotMeta.labels)}] (${Date.now() - start}ms)`,
    );
    return label ? { label: label as Slot, confidence } : undefined;
  }

  private async classifySubtype(img: RgbaImage): Promise<{ label: string; confidence: number } | undefined> {
    const start = Date.now();
    log("tag", "subtype model start");
    const session = await this.loadSubtype();
    const input = garmentInput(img, SUBTYPE_SIZE);
    const tensor = new (ort().Tensor)("float32", input, [1, 3, SUBTYPE_SIZE, SUBTYPE_SIZE]);
    const out = await session.run({ pixels: tensor });
    const logits = Array.from(Object.values(out)[0].data as Float32Array);
    const max = Math.max(...logits);
    const exps = logits.map((x) => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    let best = 0;
    for (let i = 1; i < logits.length; i++) if (logits[i]! > logits[best]!) best = i;
    const confidence = (exps[best] ?? 0) / sum;
    const label = subtypeMeta.labels[best];
    log(
      "tag",
      `subtype model -> ${label ?? "none"} conf=${confidence.toFixed(2)} [${topLabels(logits, subtypeMeta.labels)}] (${Date.now() - start}ms)`,
    );
    return label ? { label, confidence } : undefined;
  }

  async tag(uri: string): Promise<GarmentAttrs> {
    const start = Date.now();
    log("tag", `start ${uri.split("/").pop() ?? uri}`);
    try {
      const loadStart = Date.now();
      const session = await this.load();
      log("tag", `mobileclip ready (${Date.now() - loadStart}ms)`);
      const decodeStart = Date.now();
      const img = await decode(uri);
      log(
        "tag",
        `decoded ${img.width}x${img.height} alpha=${img.hasAlpha} bbox=${img.box ? `${img.box.x0},${img.box.y0} ${img.box.x1},${img.box.y1}` : "full"} (${Date.now() - decodeStart}ms)`,
      );
      const input = garmentInput(img, SIZE);
      const tensor = new (ort().Tensor)("float32", input, [1, 3, SIZE, SIZE]);
      const out = await session.run({ pixels: tensor });
      const first = Object.values(out)[0];
      const e = normalize(Array.from(first.data as Float32Array));
      log("tag", `mobileclip embedding done (${Date.now() - start}ms)`);

      let slot = (applyProbe(e, "slot") ?? zeroShot(e, "slot") ?? "top") as Slot;
      const clipSlot = slot;
      let slotConfidence = 0;
      try {
        const pred = await this.classifySlot(img);
        if (pred) {
          slot = pred.label;
          slotConfidence = pred.confidence;
        }
      } catch (err) {
        logWarn("tag", `slot model unavailable: ${errorText(err)}`);
      }
      log("tag", `slot clip=${clipSlot} final=${slot} conf=${slotConfidence.toFixed(2)}`);
      const color = dominantColor(img);
      let subtype: string | undefined;
      try {
        const pred = await this.classifySubtype(img);
        if (pred) {
          const mapped = subtypeMeta.slot_by_label[pred.label] as Slot | undefined;
          if (mapped && pred.confidence >= 0.7 && slotConfidence < 0.6) {
            log(
              "tag",
              `slot rescue ${slot} -> ${mapped} from subtype=${pred.label} conf=${pred.confidence.toFixed(2)} slotConf=${slotConfidence.toFixed(2)}`,
            );
            slot = mapped;
          }
          if (mapped && mapped === slot && pred.confidence >= 0.6) subtype = pred.label;
        }
      } catch (err) {
        logWarn("tag", `subtype model unavailable: ${errorText(err)}`);
      }
      const formalityLabel = applyProbe(e, "formality") ?? zeroShot(e, "formality") ?? "3";
      let formality = Math.max(1, Math.min(5, parseInt(formalityLabel, 10) || 3));
      if (subtype) {
        const casual = new Set(["t-shirt", "tank top", "shorts", "joggers", "sneakers", "running shoes", "sandals"]);
        const formal = new Set(["button-down shirt", "trousers", "dress shoes", "skirt", "dress"]);
        if (casual.has(subtype)) formality = Math.min(formality, 2);
        if (formal.has(subtype)) formality = Math.max(formality, 3);
      }
      const pattern = (zeroShot(e, "pattern") ?? "solid") as Pattern;
      const fit = (zeroShot(e, "fit") ?? "regular") as Fit;
      const season = (zeroShot(e, "seasons") ?? "all") as GarmentAttrs["season"];
      const material = (zeroShot(e, "materials") ?? "medium") as GarmentAttrs["material"];

      log(
        "tag",
        `done ${Date.now() - start}ms slot=${slot} subtype=${subtype ?? "-"} color=${color} formality=${formality} pattern=${pattern} fit=${fit} season=${season}`,
      );
      return {
        slot,
        colors: [color],
        pattern,
        fit,
        formality,
        season,
        material,
        subtype,
      };
    } catch (e) {
      logError("tag", `FAILED, mock fallback: ${errorText(e)}`);
      return mockTagger.tag(uri);
    }
  }
}

export function createOnnxTagger(): VisionTagger {
  return new OnnxTagger();
}
