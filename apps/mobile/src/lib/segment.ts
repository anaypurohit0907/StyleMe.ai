/**
 * On-device garment cutout: U²-Net-p salient-object mask → transparent PNG.
 * The classifier runs on a neutral-gray composite so bed/floor patterns stop
 * leaking into slot/subtype predictions.
 *
 * Photos are normalized to a 1024px JPEG with expo-image-manipulator first:
 * it bakes EXIF rotation, converts any source format to JPEG, and keeps the
 * pure-JS decode/composite/encode steps small enough for a phone.
 */
import { Asset } from "expo-asset";
import { Buffer } from "buffer";
import { Directory, File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import jpeg from "jpeg-js";
import type { InferenceSession } from "onnxruntime-react-native";
import { encodePngRgba } from "./png";
import { errorText, log, withTimeout } from "./pipeline-log";

type OrtModule = typeof import("onnxruntime-react-native");
let ortModule: OrtModule | null = null;
function ort(): OrtModule {
  if (!ortModule) ortModule = require("onnxruntime-react-native") as OrtModule;
  return ortModule;
}

// jpeg-js writes its output through the Node Buffer API. Metro/Hermes has no
// global Buffer, so provide the browser polyfill before the encoder runs.
(globalThis as unknown as { Buffer?: typeof Buffer }).Buffer ??= Buffer;

const SEG_SIZE = 320;
const WORK_MAX = 1024;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const READ_TIMEOUT = 30_000;
const SESSION_TIMEOUT = 120_000;
const INFERENCE_TIMEOUT = 120_000;
const WRITE_TIMEOUT = 30_000;

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
      log("cutout", "loading u2netp model");
      const asset = Asset.fromModule(require("../../assets/vision/u2netp.onnx"));
      await asset.downloadAsync();
      const path = (asset.localUri ?? asset.uri).replace(/^file:\/\//, "");
      log("cutout", `u2netp asset ready (${path.split("/").pop() ?? path})`);
      return ort().InferenceSession.create(path, { executionProviders: ["cpu"] });
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

function shortUri(uri: string): string {
  return uri.split("/").slice(-2).join("/");
}

function cutoutDir(): Directory {
  const dir = new Directory(Paths.document, "cutouts");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function writeBytes(name: string, bytes: Uint8Array): Promise<void> {
  const file = new File(cutoutDir(), name);
  await file.write(bytes);
}

async function prepare(uri: string): Promise<{
  data: Uint8Array;
  width: number;
  height: number;
}> {
  const start = Date.now();
  let readUri = uri;
  let temp: File | null = null;

  try {
    const prepared = await withTimeout(
      manipulateAsync(
        uri,
        [{ resize: { width: WORK_MAX } }],
        { compress: 0.92, format: SaveFormat.JPEG },
      ),
      45_000,
      "prepare image",
    );
    readUri = prepared.uri;
    temp = new File(prepared.uri);
    log("cutout", `prepared ${prepared.width}x${prepared.height} (${Date.now() - start}ms)`);
  } catch (err) {
    log("cutout", `prepare failed, decoding original: ${errorText(err)}`);
  }

  try {
    const bytes = await withTimeout(
      Promise.resolve().then(() => new File(readUri).bytes()),
      READ_TIMEOUT,
      "read image",
    );
    const raw = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 });
    log(
      "cutout",
      `decoded ${raw.width}x${raw.height} ${Math.round(bytes.length / 1024)}KB (${Date.now() - start}ms)`,
    );
    return { data: raw.data as Uint8Array, width: raw.width, height: raw.height };
  } finally {
    if (temp) {
      try {
        temp.delete();
      } catch {
        // Cache file cleanup is best-effort.
      }
    }
  }
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

export async function segmentGarment(uri: string, id: string): Promise<CutoutResult> {
  const start = Date.now();
  log("cutout", `start ${id} src=${shortUri(uri)}`);

  const img = await prepare(uri);
  const { data, width, height } = img;

  const preprocess = Date.now();
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
  log("cutout", `preprocess ${width}x${height} -> ${SEG_SIZE} (${Date.now() - preprocess}ms)`);

  const session = await withTimeout(loadSession(), SESSION_TIMEOUT, "load segmentation model");
  const tensor = new (ort().Tensor)("float32", small, [1, 3, SEG_SIZE, SEG_SIZE]);
  const inference = Date.now();
  log("cutout", "running u2netp...");
  const out = await withTimeout(
    session.run({ "input.1": tensor }),
    INFERENCE_TIMEOUT,
    "u2netp inference",
  );
  const first = Object.values(out)[0];
  const raw = first?.data as Float32Array | undefined;
  if (!raw || raw.length !== plane) {
    throw new Error(`u2netp returned an unexpected mask (${raw?.length ?? "none"} values)`);
  }
  log("cutout", `u2netp inference done (${Date.now() - inference}ms)`);

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
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((mask[y * width + x] ?? 0) > 0.5) {
        kept++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const coverage = kept / mask.length;
  const bbox = maxX >= 0 ? `${minX},${minY} ${maxX},${maxY}` : "none";

  // Bad mask (whole frame or almost nothing): keep the original as fallback.
  const useMask = coverage > 0.03 && coverage < 0.92;
  log(
    "cutout",
    `mask min=${min.toFixed(2)} max=${max.toFixed(2)} cov=${coverage.toFixed(3)} bbox=${bbox} useMask=${useMask}`,
  );

  const composite = Date.now();
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
  log("cutout", `composite ${width}x${height} (${Date.now() - composite}ms)`);

  const dir = cutoutDir();
  const cutoutUri = new File(dir, `${id}.png`).uri;
  const classifyUri = new File(dir, `${id}_gray.jpg`).uri;

  const pngStart = Date.now();
  const png = encodePngRgba(cutout, width, height);
  log("cutout", `png encoded ${Math.round(png.length / 1024)}KB (${Date.now() - pngStart}ms)`);

  const writePngStart = Date.now();
  await withTimeout(writeBytes(`${id}.png`, png), WRITE_TIMEOUT, "write cutout png");
  log("cutout", `png written (${Date.now() - writePngStart}ms) ${shortUri(cutoutUri)}`);

  const jpegStart = Date.now();
  const encoded = jpeg.encode({ data: gray, width, height }, 88).data;
  log("cutout", `gray jpeg encoded ${Math.round(encoded.length / 1024)}KB (${Date.now() - jpegStart}ms)`);

  const writeJpegStart = Date.now();
  await withTimeout(writeBytes(`${id}_gray.jpg`, encoded), WRITE_TIMEOUT, "write classify jpeg");
  log("cutout", `gray jpeg written (${Date.now() - writeJpegStart}ms)`);

  log("cutout", `done ${id} total=${Date.now() - start}ms cov=${coverage.toFixed(3)}`);
  return { cutoutUri, classifyUri, coverage };
}
