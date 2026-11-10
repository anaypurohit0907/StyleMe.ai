/**
 * Real on-device tagger: MobileCLIP-S1 (ONNX) + prompt embeddings + probes.
 *
 * Requires a dev build (onnxruntime-react-native is a native module). The mock
 * tagger remains the fallback so the product loop works in Expo Go.
 */
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import jpeg from "jpeg-js";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import type { ColorName, Fit, GarmentAttrs, Pattern, Slot } from "@styleme/schema";
import type { VisionTagger } from "./vision";

const SIZE = 256;
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
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const bin = globalThis.atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const raw = jpeg.decode(bytes, { useTArray: true });
  return { data: raw.data as Uint8Array, width: raw.width, height: raw.height };
}

class OnnxTagger implements VisionTagger {
  readonly name = "mobileclip-s1-onnx";
  private session: Promise<InferenceSession> | null = null;

  private load(): Promise<InferenceSession> {
    if (!this.session) {
      this.session = (async () => {
        const asset = Asset.fromModule(require("../../assets/vision/mobileclip_s1_image.onnx"));
        await asset.downloadAsync();
        const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
        return InferenceSession.create(path, { executionProviders: ["cpu"] });
      })();
    }
    return this.session;
  }

  async tag(uri: string): Promise<GarmentAttrs> {
    const session = await this.load();
    const img = await decode(uri);
    const input = resizeRgba(img.data, img.width, img.height, SIZE);
    const tensor = new Tensor("float32", input, [1, 3, SIZE, SIZE]);
    const out = await session.run({ pixels: tensor });
    const first = Object.values(out)[0];
    const e = normalize(Array.from(first.data as Float32Array));

    const slot = (applyProbe(e, "slot") ?? zeroShot(e, "slot") ?? "top") as Slot;
    const color = (applyProbe(e, "color") ?? zeroShot(e, "color_ml") ?? "black") as ColorName;
    const formalityLabel = applyProbe(e, "formality") ?? zeroShot(e, "formality") ?? "3";
    const pattern = (zeroShot(e, "pattern") ?? "solid") as Pattern;
    const fit = (zeroShot(e, "fit") ?? "regular") as Fit;
    const season = (zeroShot(e, "seasons") ?? "all") as GarmentAttrs["season"];
    const material = (zeroShot(e, "materials") ?? "medium") as GarmentAttrs["material"];

    return {
      slot,
      colors: [color],
      pattern,
      fit,
      formality: Math.max(1, Math.min(5, parseInt(formalityLabel, 10) || 3)),
      season,
      material,
    };
  }
}

export function createOnnxTagger(): VisionTagger {
  return new OnnxTagger();
}
