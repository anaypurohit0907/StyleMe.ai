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
import { errorText, log } from "./pipeline-log";
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
const slotMeta = require("../../assets/vision/slot_product_mobilenet.json") as { labels: string[] };

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

function median(values: number[]): number {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? 0;
}

/** Center-crop median color -> nearest palette anchor. Robust for solids. */
function dominantColor(src: Uint8Array, w: number, h: number): ColorName {
  const x0 = Math.floor(w * 0.2);
  const x1 = Math.floor(w * 0.8);
  const y0 = Math.floor(h * 0.2);
  const y1 = Math.floor(h * 0.8);
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * w + x) * 4;
      rs.push(src[i] ?? 0);
      gs.push(src[i + 1] ?? 0);
      bs.push(src[i + 2] ?? 0);
    }
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

async function decode(uri: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const bytes = await new File(uri).bytes();
  const raw = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 });
  return { data: raw.data as Uint8Array, width: raw.width, height: raw.height };
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
        const asset = Asset.fromModule(require("../../assets/vision/slot_product_mobilenet.onnx"));
        await asset.downloadAsync();
        const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
        return ort().InferenceSession.create(path, { executionProviders: ["cpu"] });
      })();
    }
    return this.slotSession;
  }

  private async classifySlot(img: { data: Uint8Array; width: number; height: number }): Promise<Slot | undefined> {
    const start = Date.now();
    log("tag", "slot model start");
    const session = await this.loadSlot();
    const input = resizeRgba(img.data, img.width, img.height, SUBTYPE_SIZE);
    const tensor = new (ort().Tensor)("float32", input, [1, 3, SUBTYPE_SIZE, SUBTYPE_SIZE]);
    const out = await session.run({ pixels: tensor });
    const logits = Array.from(Object.values(out)[0].data as Float32Array);
    let best = 0;
    for (let i = 1; i < logits.length; i++) if (logits[i]! > logits[best]!) best = i;
    const label = slotMeta.labels[best];
    log("tag", `slot model -> ${label ?? "none"} (${Date.now() - start}ms)`);
    return (label as Slot | undefined) ?? undefined;
  }

  private async classifySubtype(img: { data: Uint8Array; width: number; height: number }, slot: Slot): Promise<string | undefined> {
    const start = Date.now();
    log("tag", `subtype model start (slot=${slot})`);
    const session = await this.loadSubtype();
    const input = resizeRgba(img.data, img.width, img.height, SUBTYPE_SIZE);
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
    const accepted = Boolean(label) && confidence >= 0.6 && subtypeMeta.slot_by_label[label!] === slot;
    log(
      "tag",
      `subtype model -> ${label ?? "none"} conf=${confidence.toFixed(2)} accepted=${accepted} (${Date.now() - start}ms)`,
    );
    if (!label || confidence < 0.6) return undefined;
    return subtypeMeta.slot_by_label[label] === slot ? label : undefined;
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
      log("tag", `decoded ${img.width}x${img.height} (${Date.now() - decodeStart}ms)`);
      const input = resizeRgba(img.data, img.width, img.height, SIZE);
      const tensor = new (ort().Tensor)("float32", input, [1, 3, SIZE, SIZE]);
      const out = await session.run({ pixels: tensor });
      const first = Object.values(out)[0];
      const e = normalize(Array.from(first.data as Float32Array));
      log("tag", `mobileclip embedding done (${Date.now() - start}ms)`);

      let slot = (applyProbe(e, "slot") ?? zeroShot(e, "slot") ?? "top") as Slot;
      const clipSlot = slot;
      try {
        slot = (await this.classifySlot(img)) ?? slot;
      } catch (err) {
        log("tag", `slot model unavailable: ${errorText(err)}`);
      }
      log("tag", `slot clip=${clipSlot} final=${slot}`);
      const color = dominantColor(img.data, img.width, img.height);
      let subtype: string | undefined;
      try {
        subtype = await this.classifySubtype(img, slot);
      } catch (err) {
        log("tag", `subtype model unavailable: ${errorText(err)}`);
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
      log("tag", `FAILED, mock fallback: ${errorText(e)}`);
      return mockTagger.tag(uri);
    }
  }
}

export function createOnnxTagger(): VisionTagger {
  return new OnnxTagger();
}
