/**
 * On-device garment cutout: U²-Net-p salient-object mask → transparent PNG.
 * The classifier runs on a neutral-gray composite so bed/floor patterns stop
 * leaking into slot/subtype predictions.
 */
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import jpeg from "jpeg-js";
import { PNG } from "pngjs/browser";
import { toByteArray, fromByteArray } from "base64-js";
import type { InferenceSession } from "onnxruntime-react-native";

type OrtModule = typeof import("onnxruntime-react-native");
let ortModule: OrtModule | null = null;
function ort(): OrtModule {
  if (!ortModule) ortModule = require("onnxruntime-react-native") as OrtModule;
  return ortModule;
}

const SEG_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export interface CutoutResult {
  /** Transparent PNG for the wardrobe card. */
  cutoutUri: string;
  /** Garment on neutral gray, used by the tagger. */
  classifyUri: string;
  /** Fraction of pixels the mask kept. */
  coverage: number;
}

let sessionPromise: Promise<InferenceSession> | null = null;

function loadSession(): Promise<InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const asset = Asset.fromModule(require("../../assets/vision/u2netp.onnx"));
      await asset.downloadAsync();
      const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
      return ort().InferenceSession.create(path, { executionProviders: ["cpu"] });
    })();
  }
  return sessionPromise;
}

async function decode(uri: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const raw = jpeg.decode(toByteArray(b64), { useTArray: true });
  return { data: raw.data as Uint8Array, width: raw.width, height: raw.height };
}

function resizeMask(mask: Float32Array, size: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(size - 1, Math.floor((y * size) / h));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(size - 1, Math.floor((x * size) / w));
      out[y * w + x] = mask[sy * size + sx] ?? 0;
    }
  }
  return out;
}

async function writePng(path: string, png: PNG): Promise<void> {
  const bytes = PNG.sync.write(png);
  await FileSystem.writeAsStringAsync(path, fromByteArray(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function writeJpeg(path: string, data: Uint8Array, w: number, h: number): Promise<void> {
  const encoded = jpeg.encode({ data, width: w, height: h }, 88).data;
  await FileSystem.writeAsStringAsync(path, fromByteArray(encoded), {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function segmentGarment(uri: string, id: string): Promise<CutoutResult> {
  const img = await decode(uri);
  const { data, width, height } = img;

  const small = new Float32Array(3 * SEG_SIZE * SEG_SIZE);
  const plane = SEG_SIZE * SEG_SIZE;
  for (let y = 0; y < SEG_SIZE; y++) {
    const sy = Math.min(height - 1, Math.floor((y * height) / SEG_SIZE));
    for (let x = 0; x < SEG_SIZE; x++) {
      const sx = Math.min(width - 1, Math.floor((x * width) / SEG_SIZE));
      const si = (sy * width + sx) * 4;
      const di = y * SEG_SIZE + x;
      small[di] = ((data[si] ?? 0) / 255 - MEAN[0]!) / STD[0]!;
      small[plane + di] = ((data[si + 1] ?? 0) / 255 - MEAN[1]!) / STD[1]!;
      small[2 * plane + di] = ((data[si + 2] ?? 0) / 255 - MEAN[2]!) / STD[2]!;
    }
  }

  const session = await loadSession();
  const tensor = new (ort().Tensor)("float32", small, [1, 3, SEG_SIZE, SEG_SIZE]);
  const out = await session.run({ "input.1": tensor });
  const raw = (Object.values(out)[0].data as Float32Array) ?? new Float32Array(plane);
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const norm = new Float32Array(plane);
  for (let i = 0; i < plane; i++) norm[i] = ((raw[i] ?? 0) - min) / span;

  const mask = resizeMask(norm, SEG_SIZE, width, height);
  let kept = 0;
  for (let i = 0; i < mask.length; i++) if ((mask[i] ?? 0) > 0.5) kept++;
  const coverage = kept / mask.length;

  // Bad mask (whole frame or almost nothing): keep the original as fallback.
  const useMask = coverage > 0.03 && coverage < 0.92;

  const cutout = new Uint8Array(width * height * 4);
  const gray = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const si = i * 4;
    const alpha = useMask ? Math.max(0, Math.min(1, mask[i] ?? 0)) : 1;
    const r = data[si] ?? 0;
    const g = data[si + 1] ?? 0;
    const b = data[si + 2] ?? 0;
    cutout[si] = r;
    cutout[si + 1] = g;
    cutout[si + 2] = b;
    cutout[si + 3] = Math.round(alpha * 255);
    gray[si] = Math.round(r * alpha + 128 * (1 - alpha));
    gray[si + 1] = Math.round(g * alpha + 128 * (1 - alpha));
    gray[si + 2] = Math.round(b * alpha + 128 * (1 - alpha));
    gray[si + 3] = 255;
  }

  const dir = `${FileSystem.documentDirectory}cutouts/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const cutoutUri = `${dir}${id}.png`;
  const classifyUri = `${dir}${id}_gray.jpg`;
  const png = new PNG({ width, height });
  (png as unknown as { data: Uint8Array }).data = cutout;
  await writePng(cutoutUri, png);
  await writeJpeg(classifyUri, gray, width, height);
  return { cutoutUri, classifyUri, coverage };
}
