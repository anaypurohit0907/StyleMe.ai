/**
 * D1 row mapping. Keeps SQL at the edges, clean types in the middle.
 */
import type {
  Garment,
  PreferenceVector,
  ToneProfile,
  WardrobeSync,
} from "@styleme/schema";
import { emptyPreference } from "@styleme/schema";
import type { SignatureState } from "@styleme/engine";

export interface UserRow {
  id: string;
  locale: string | null;
  onboarding: Record<string, unknown> | null;
  tone: ToneProfile | null;
  prefs: PreferenceVector;
  exploreState: Record<string, SignatureState>;
  created_at: number;
}

export function mapUser(row: Record<string, unknown> | null): UserRow | null {
  if (!row) return null;
  return {
    id: row.id as string,
    locale: (row.locale as string | null) ?? null,
    onboarding: row.onboarding ? (JSON.parse(row.onboarding as string) as Record<string, unknown>) : null,
    tone: row.tone ? (JSON.parse(row.tone as string) as ToneProfile) : null,
    prefs: row.prefs ? (JSON.parse(row.prefs as string) as PreferenceVector) : emptyPreference(),
    exploreState: row.explore_state
      ? (JSON.parse(row.explore_state as string) as Record<string, SignatureState>)
      : {},
    created_at: row.created_at as number,
  };
}

export function mapGarment(row: Record<string, unknown>): Garment {
  return {
    id: row.id as string,
    attrs: JSON.parse(row.attrs as string),
    status: row.status as Garment["status"],
    photoRef: (row.photo_ref as string) ?? "",
    embedding: row.embedding ? (row.embedding as string) : undefined,
    addedAt: row.added_at as number,
    lastWornAt: (row.last_worn_at as number | null) ?? null,
    corrections: row.corrections
      ? (JSON.parse(row.corrections as string) as Garment["corrections"])
      : [],
  };
}

export async function listGarments(db: D1Database, userId: string): Promise<Garment[]> {
  const res = await db.prepare("SELECT * FROM garments WHERE user_id = ?").bind(userId).all();
  return (res.results as Record<string, unknown>[]).map(mapGarment);
}

export async function syncWardrobe(
  db: D1Database,
  userId: string,
  sync: WardrobeSync,
): Promise<number> {
  const batch: D1PreparedStatement[] = [];
  for (const g of sync.upserts) {
    batch.push(
      db
        .prepare(
          `INSERT INTO garments (id, user_id, attrs, status, photo_ref, embedding, added_at, last_worn_at, corrections)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           attrs = excluded.attrs,
           status = excluded.status,
           photo_ref = excluded.photo_ref,
           embedding = excluded.embedding,
           last_worn_at = excluded.last_worn_at,
           corrections = excluded.corrections`,
        )
        .bind(
          g.id,
          userId,
          JSON.stringify(g.attrs),
          g.status,
          g.photoRef,
          g.embedding ?? null,
          g.addedAt,
          g.lastWornAt,
          JSON.stringify(g.corrections),
        ),
    );
  }
  for (const id of sync.deletions) {
    batch.push(db.prepare("DELETE FROM garments WHERE id = ? AND user_id = ?").bind(id, userId));
  }
  if (batch.length > 0) await db.batch(batch);
  return sync.upserts.length + sync.deletions.length;
}

export async function ensureUser(
  db: D1Database,
  id: string,
  onboarding?: Record<string, unknown>,
  tone?: ToneProfile,
): Promise<UserRow> {
  const existing = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  if (existing) {
    if (onboarding || tone) {
      await db
        .prepare("UPDATE users SET onboarding = COALESCE(?, onboarding), tone = COALESCE(?, tone) WHERE id = ?")
        .bind(onboarding ? JSON.stringify(onboarding) : null, tone ? JSON.stringify(tone) : null, id)
        .run();
    }
    return mapUser((await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first()) as Record<string, unknown>)!;
  }
  await db
    .prepare("INSERT INTO users (id, locale, onboarding, tone, prefs, explore_state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(
      id,
      onboarding?.city ? String(onboarding.city) : null,
      onboarding ? JSON.stringify(onboarding) : null,
      tone ? JSON.stringify(tone) : null,
      JSON.stringify(emptyPreference()),
      "{}",
      Date.now(),
    )
    .run();
  return mapUser((await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first()) as Record<string, unknown>)!;
}
