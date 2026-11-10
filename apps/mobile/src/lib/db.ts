/**
 * Local wardrobe database (expo-sqlite).
 *
 * The phone is the source of truth; the worker is a sync + decision target.
 * Schema mirrors apps/worker/migrations/0001_init.sql (subset: no users
 * table on-device — device id lives in meta).
 */
import * as SQLite from "expo-sqlite";
import type { Garment, GarmentStatus, LearnEvent, LaundryEvent, RecommendContext, ScoredOutfit } from "@styleme/schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("styleme.db");
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync(`
CREATE TABLE IF NOT EXISTS garments (
  id TEXT PRIMARY KEY,
  attrs TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  photo_ref TEXT,
  added_at INTEGER NOT NULL,
  last_worn_at INTEGER,
  corrections TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS wear_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  garment_ids TEXT NOT NULL,
  worn_at INTEGER NOT NULL,
  occasion TEXT,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  offered TEXT NOT NULL,
  picked TEXT,
  context TEXT,
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);
  return db;
}

// --- meta (device id, token, onboarding, tone) ------------------------------

export async function metaGet(key: string): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ value: string | null }>("SELECT value FROM meta WHERE key = ?", key);
  return row?.value ?? null;
}

export async function metaSet(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

// --- garments ----------------------------------------------------------------

export async function upsertGarment(g: Garment): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    `INSERT INTO garments (id, attrs, status, photo_ref, added_at, last_worn_at, corrections)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       attrs = excluded.attrs,
       status = excluded.status,
       photo_ref = excluded.photo_ref,
       last_worn_at = excluded.last_worn_at,
       corrections = excluded.corrections`,
    g.id,
    JSON.stringify(g.attrs),
    g.status,
    g.photoRef,
    g.addedAt,
    g.lastWornAt,
    JSON.stringify(g.corrections),
  );
}

export async function listGarments(): Promise<Garment[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<{
    id: string;
    attrs: string;
    status: GarmentStatus;
    photo_ref: string | null;
    added_at: number;
    last_worn_at: number | null;
    corrections: string;
  }>("SELECT * FROM garments ORDER BY added_at DESC");
  return rows.map((r) => ({
    id: r.id,
    attrs: JSON.parse(r.attrs),
    status: r.status,
    photoRef: r.photo_ref ?? "",
    addedAt: r.added_at,
    lastWornAt: r.last_worn_at ?? null,
    corrections: JSON.parse(r.corrections || "[]"),
  }));
}

export async function setGarmentStatus(ids: string[], status: GarmentStatus): Promise<void> {
  const d = await getDb();
  for (const id of ids) {
    await d.runAsync("UPDATE garments SET status = ? WHERE id = ?", status, id);
  }
}

export async function countGarments(): Promise<number> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM garments");
  return row?.n ?? 0;
}

export async function getGarment(id: string): Promise<Garment | null> {
  const d = await getDb();
  const r = await d.getFirstAsync<{
    id: string;
    attrs: string;
    status: GarmentStatus;
    photo_ref: string | null;
    added_at: number;
    last_worn_at: number | null;
    corrections: string;
  }>("SELECT * FROM garments WHERE id = ?", id);
  if (!r) return null;
  return {
    id: r.id,
    attrs: JSON.parse(r.attrs),
    status: r.status,
    photoRef: r.photo_ref ?? "",
    addedAt: r.added_at,
    lastWornAt: r.last_worn_at ?? null,
    corrections: JSON.parse(r.corrections || "[]"),
  };
}

export async function deleteGarment(id: string): Promise<void> {
  const d = await getDb();
  await d.runAsync("DELETE FROM garments WHERE id = ?", id);
}

// --- learning log (local mirror of what we push to the worker) ---------------

export async function logWear(garmentIds: string[], occasion: string, ts: number): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    "INSERT INTO wear_log (garment_ids, worn_at, occasion, ts) VALUES (?, ?, ?, ?)",
    JSON.stringify(garmentIds),
    ts,
    occasion,
    ts,
  );
  for (const id of garmentIds) {
    await d.runAsync("UPDATE garments SET last_worn_at = ? WHERE id = ?", ts, id);
  }
}

export async function logSuggestion(
  offered: ScoredOutfit[],
  picked: string | null,
  context: RecommendContext,
): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    "INSERT INTO suggestions (offered, picked, context, ts) VALUES (?, ?, ?, ?)",
    JSON.stringify(offered.map((o) => o.garmentIds)),
    picked,
    JSON.stringify(context),
    context.now,
  );
}

export async function lastSuggestion(): Promise<{
  offered: string[][];
  picked: string | null;
  context: RecommendContext;
} | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ offered: string; picked: string | null; context: string }>(
    "SELECT offered, picked, context FROM suggestions ORDER BY ts DESC LIMIT 1",
  );
  if (!row) return null;
  return {
    offered: JSON.parse(row.offered),
    picked: row.picked,
    context: JSON.parse(row.context),
  };
}

export type { LearnEvent, LaundryEvent };
