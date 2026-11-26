/**
 * Local-only closet backup.
 *
 * One ZIP (stored entries, no external zip dependency) containing a manifest,
 * wardrobe rows + corrections, wear log, safe settings, and referenced photos.
 * Destined for the user's chosen SAF folder; nothing is uploaded.
 */
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import type { Garment } from "@styleme/schema";
import { getDb, listGarments, metaGet } from "./db";
import { bytesToBase64, createStoredZip, type ZipEntry } from "@styleme/engine";

const SAFE_META_KEYS = [
  "name",
  "city",
  "vibes",
  "wardrobeSizeGuess",
  "onboarded",
  "laundry",
  "prefs",
  "explore",
  "pollsShown",
  "streakCelebration",
  "funnel",
] as const;

interface WearRow {
  id: number;
  garment_ids: string;
  worn_at: number;
  occasion: string | null;
  ts: number;
}

interface BackupPhoto {
  garmentId: string;
  kind: "cutout" | "original";
  file: string;
  bytes: number;
}

export interface BackupPayload {
  manifest: {
    schemaVersion: 1;
    app: "StyleMe";
    createdAt: string;
    counts: { garments: number; wearLog: number; photos: number };
    photos: BackupPhoto[];
    missingPhotos: number;
  };
  garments: Garment[];
  wearLog: WearRow[];
  meta: Record<string, string>;
}

export interface BackupResult {
  cancelled: boolean;
  fileName?: string;
  bytes?: number;
  garmentCount?: number;
  wearCount?: number;
  photoCount?: number;
}

function encodeUtf8(value: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < value.length; i++) {
    let code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

function photoExt(uri: string, fallback: string): string {
  const match = uri.match(/\.(png|jpe?g|webp)$/i);
  return (match?.[0] ?? fallback).toLowerCase();
}

export async function collectBackup(): Promise<{ payload: BackupPayload; entries: ZipEntry[] }> {
  const garments = await listGarments();
  const db = await getDb();
  const wearLog = await db.getAllAsync<WearRow>(
    "SELECT id, garment_ids, worn_at, occasion, ts FROM wear_log ORDER BY worn_at ASC, id ASC",
  );
  const meta: Record<string, string> = {};
  for (const key of SAFE_META_KEYS) {
    const value = await metaGet(key);
    if (value != null) meta[key] = value;
  }

  const photos: BackupPhoto[] = [];
  const entries: ZipEntry[] = [];
  let missingPhotos = 0;

  for (const garment of garments) {
    const refs: Array<{ kind: "cutout" | "original"; uri: string }> = [];
    if (garment.photoRef) refs.push({ kind: "cutout", uri: garment.photoRef });
    if (garment.originalRef && garment.originalRef !== garment.photoRef) {
      refs.push({ kind: "original", uri: garment.originalRef });
    }
    for (const ref of refs) {
      try {
        const bytes = await new File(ref.uri).bytes();
        if (bytes.length === 0) throw new Error("empty photo");
        const ext = photoExt(ref.uri, ref.kind === "cutout" ? ".png" : ".jpg");
        const file = `photos/${garment.id}_${ref.kind}${ext}`;
        entries.push({ name: file, data: bytes });
        photos.push({ garmentId: garment.id, kind: ref.kind, file, bytes: bytes.length });
      } catch {
        missingPhotos++;
      }
    }
  }

  const payload: BackupPayload = {
    manifest: {
      schemaVersion: 1,
      app: "StyleMe",
      createdAt: new Date().toISOString(),
      counts: { garments: garments.length, wearLog: wearLog.length, photos: photos.length },
      photos,
      missingPhotos,
    },
    garments,
    wearLog,
    meta,
  };
  entries.unshift(
    { name: "manifest.json", data: encodeUtf8(JSON.stringify(payload.manifest, null, 2)) },
    { name: "wardrobe.json", data: encodeUtf8(JSON.stringify(payload, null, 2)) },
  );
  return { payload, entries };
}

export async function exportBackup(): Promise<BackupResult> {
  const { payload, entries } = await collectBackup();
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return { cancelled: true };

  const name = `styleme-backup-${payload.manifest.createdAt.slice(0, 10)}.zip`;
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    name.replace(/\.zip$/i, ""),
    "application/zip",
  );
  const bytes = createStoredZip(entries);
  await FileSystem.writeAsStringAsync(fileUri, bytesToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return {
    cancelled: false,
    fileName: name,
    bytes: bytes.length,
    garmentCount: payload.manifest.counts.garments,
    wearCount: payload.manifest.counts.wearLog,
    photoCount: payload.manifest.counts.photos,
  };
}

export function formatBackupSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
