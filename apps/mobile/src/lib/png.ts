/**
 * Minimal PNG RGBA encoder.
 *
 * pngjs/pako deflate is pure JS and blocks the Hermes thread for minutes on
 * multi-megapixel cutouts. PNG allows uncompressed ("stored") deflate blocks,
 * so this encoder is just a checksum + byte copy. Files are larger, but the
 * cutout maxes at 1024px and writing stays fast and predictable.
 */

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) {
    c = CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  const MOD = 65521;
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a += bytes[i] ?? 0;
    b += a;
    // Keep both accumulators below 2^53; reduce once per 64K block.
    if ((i & 0xffff) === 0xffff) {
      a %= MOD;
      b %= MOD;
    }
  }
  return (((b % MOD) << 16) | (a % MOD)) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function storedZlib(raw: Uint8Array): Uint8Array {
  const BLOCK = 65535;
  const blocks = Math.max(1, Math.ceil(raw.length / BLOCK));
  const out = new Uint8Array(2 + blocks * 5 + raw.length + 4);
  out[0] = 0x78; // CMF: deflate, 32K window
  out[1] = 0x01; // FLG: no dict, fastest
  let offset = 2;
  for (let i = 0; i < blocks; i++) {
    const start = i * BLOCK;
    const len = Math.min(BLOCK, raw.length - start);
    out[offset++] = i === blocks - 1 ? 1 : 0; // BFINAL + BTYPE=00 (stored)
    out[offset++] = len & 0xff;
    out[offset++] = (len >>> 8) & 0xff;
    out[offset++] = ~len & 0xff;
    out[offset++] = (~len >>> 8) & 0xff;
    out.set(raw.subarray(start, start + len), offset);
    offset += len;
  }
  const adler = adler32(raw);
  out[offset++] = (adler >>> 24) & 0xff;
  out[offset++] = (adler >>> 16) & 0xff;
  out[offset++] = (adler >>> 8) & 0xff;
  out[offset++] = adler & 0xff;
  return out;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/** Inflate the stored (BTYPE=0) deflate stream produced by `storedZlib`. */
function inflateStored(z: Uint8Array): Uint8Array {
  if (z.length < 6) throw new Error("PNG: truncated zlib stream");
  const cmf = z[0] ?? 0;
  const flg = z[1] ?? 0;
  if ((cmf * 256 + flg) % 31 !== 0) throw new Error("PNG: bad zlib header");
  if ((cmf & 0x0f) !== 8) throw new Error("PNG: unsupported zlib compression");

  let offset = 2;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    if (offset >= z.length) throw new Error("PNG: truncated deflate block");
    const header = z[offset++] ?? 0;
    const final = (header & 1) === 1;
    const type = (header >> 1) & 3;
    if (type !== 0) throw new Error("PNG: compressed deflate blocks are not supported");
    const len = (z[offset] ?? 0) | ((z[offset + 1] ?? 0) << 8);
    const nlen = (z[offset + 2] ?? 0) | ((z[offset + 3] ?? 0) << 8);
    offset += 4;
    if ((len ^ 0xffff) !== nlen) throw new Error("PNG: bad deflate block length");
    if (offset + len > z.length) throw new Error("PNG: truncated deflate data");
    chunks.push(z.subarray(offset, offset + len));
    total += len;
    offset += len;
    if (final) break;
  }
  return concat(chunks);
}

/**
 * Decode the cutout PNGs this module writes. Only 8-bit RGBA, filter 0, and
 * stored deflate are accepted; that is exactly what `encodePngRgba` emits.
 * Legacy pngjs cutouts (real deflate) are rejected so callers can fall back.
 */
export function decodePngRgba(bytes: Uint8Array): {
  data: Uint8Array;
  width: number;
  height: number;
} {
  if (!isPng(bytes)) throw new Error("PNG: bad signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];

  while (offset + 12 <= bytes.length) {
    const length = readU32(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0,
    );
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = readU32(data, 0);
      height = readU32(data, 4);
      if (data[8] !== 8 || data[9] !== 6) {
        throw new Error("PNG: only 8-bit RGBA is supported");
      }
      if (data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error("PNG: unsupported compression/filter/interlace");
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width <= 0 || height <= 0) throw new Error("PNG: missing IHDR");
  if (idat.length === 0) throw new Error("PNG: missing IDAT");

  const raw = inflateStored(concat(idat));
  const stride = width * 4;
  if (raw.length < (stride + 1) * height) throw new Error("PNG: truncated scanlines");

  const data = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const src = y * (stride + 1);
    if (raw[src] !== 0) throw new Error("PNG: unsupported scanline filter");
    data.set(raw.subarray(src + 1, src + 1 + stride), y * stride);
  }
  return { data, width, height };
}

/** Encode straight RGBA bytes (row-major, 4 bytes/pixel) as a PNG. */
export function encodePngRgba(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const src = y * stride;
    const dst = y * (stride + 1);
    raw[dst] = 0; // filter: none
    raw.set(rgba.subarray(src, src + stride), dst + 1);
  }

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", storedZlib(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
