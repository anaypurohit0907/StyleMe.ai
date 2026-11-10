/**
 * StyleMe API — Cloudflare Worker (Hono).
 *
 * Runs the @styleme/engine (pure TS) against D1 state. No GPU, no heavy
 * deps — recommendation is math, well under the free tier's CPU budget.
 *
 * Free-tier budget: 100k req/day, 10ms CPU/req (free). One /recommend
 * per user per day is far below this.
 */
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import {
  emptyPreference,
  LaundryEventSchema,
  LearnEventSchema,
  RecommendContextSchema,
  WardrobeSyncSchema,
  type RecommendResponse,
} from "@styleme/schema";
import {
  BANKS,
  outfitSignature,
  recommend,
  toneText,
  updateExploreState,
  updatePreference,
  type SignatureState,
} from "@styleme/engine";
import { mintToken, verifyToken } from "./auth";
import {
  ensureUser,
  listGarments,
  mapGarment,
  syncWardrobe,
  type UserRow,
} from "./db";
import { createWeatherCache, fetchWeather } from "./weather";

interface Bindings {
  DB: D1Database;
  PHOTOS: R2Bucket;
  JWT_SECRET: string;
  GEMINI_API_KEY?: string;
}

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
  }
}

const app = new Hono<{ Bindings: Bindings }>();

const weatherCache = createWeatherCache();

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post("/v1/auth/device", async (c) => {
  const body = await c.req.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId.trim() : "";
  if (!deviceId || deviceId.length < 8 || deviceId.length > 128) {
    return c.json({ error: "deviceId must be 8-128 chars" }, 400);
  }
  const onboarding =
    body?.onboarding && typeof body.onboarding === "object"
      ? (body.onboarding as Record<string, unknown>)
      : undefined;
  await ensureUser(c.env.DB, deviceId, onboarding);
  const token = await mintToken(c.env.JWT_SECRET, deviceId);
  return c.json({ token, userId: deviceId });
});

const auth = bearerAuth({
  verifyToken: async (token, c) => {
    const userId = await verifyToken((c.env as Bindings).JWT_SECRET, token);
    if (!userId) return false;
    c.set("userId", userId);
    return true;
  },
});

// ---------------------------------------------------------------------------
// Wardrobe sync
// ---------------------------------------------------------------------------

app.post("/v1/wardrobe/sync", auth, async (c) => {
  const body = await c.req.json().catch(() => null);
  const sync = WardrobeSyncSchema.safeParse(body);
  if (!sync.success) {
    return c.json({ error: "invalid sync payload", issues: sync.error.issues.slice(0, 5) }, 400);
  }
  const n = await syncWardrobe(c.env.DB, c.get("userId"), sync.data);
  return c.json({ ok: true, applied: n });
});

// ---------------------------------------------------------------------------
// Recommend — the daily "Today" payload
// ---------------------------------------------------------------------------

app.post("/v1/recommend", auth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => ({}));

  const user = await ensureUser(c.env.DB, userId);
  const garments = await listGarments(c.env.DB, userId);
  if (garments.length === 0) {
    return c.json({ outfits: [], note: "wardrobe empty — add items first", ts: Date.now() });
  }

  // Context: client may send occasion/mood; weather resolved server-side.
  const partial = {
    occasion: body.occasion,
    mood: body.mood ?? "none",
    now: typeof body.now === "number" ? body.now : Date.now(),
  };
  let weather: { tempC: number; isRaining: boolean };
  if (typeof body.weather?.tempC === "number") {
    weather = { tempC: body.weather.tempC, isRaining: !!body.weather.isRaining };
  } else {
    try {
      weather = await fetchWeather(weatherCache, body.city, body.lat, body.lon);
    } catch {
      // no location known: default to mild-dry so we still recommend
      weather = { tempC: 20, isRaining: false };
    }
  }
  const context = RecommendContextSchema.parse({ ...partial, weather });

  const res = recommend({
    userId,
    wardrobe: garments,
    context,
    prefs: user.prefs,
    exploreState: user.exploreState,
  });

  // Log the suggestion (learning substrate).
  await c.env.DB
    .prepare(
      "INSERT INTO suggestions (user_id, offered, picked, context, ts) VALUES (?, ?, NULL, ?, ?)",
    )
    .bind(userId, JSON.stringify(res.outfits.map((o) => o.garmentIds)), JSON.stringify(context), context.now)
    .run();

  const out: RecommendResponse = { outfits: res.outfits, context, ts: Date.now() };
  return c.json({ ...out, meta: res.meta });
});

// ---------------------------------------------------------------------------
// Laundry
// ---------------------------------------------------------------------------

app.post("/v1/laundry", auth, async (c) => {
  const userId = c.get("userId");
  const ev = LaundryEventSchema.safeParse(await c.req.json().catch(() => null));
  if (!ev.success) return c.json({ error: "invalid laundry event" }, 400);

  const d = ev.data;
  const status = d.event === "in_wash" ? "in_wash" : "available";
  const batch = d.garmentIds.map(
    (id) =>
      c.env.DB.prepare(
        "UPDATE garments SET status = ?, last_worn_at = CASE WHEN ? = 'washed' THEN NULL ELSE last_worn_at END WHERE id = ? AND user_id = ?",
      ).bind(status, d.event, id, userId),
  );
  batch.push(
    c.env.DB
      .prepare(
        "INSERT INTO laundry_events (user_id, garment_ids, event, expected_available_at, ts) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(userId, JSON.stringify(d.garmentIds), d.event, d.expectedAvailableAt, d.ts),
  );
  await c.env.DB.batch(batch);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Learn — pick event drives the preference vector + rotation + explore state
// ---------------------------------------------------------------------------

app.post("/v1/learn", auth, async (c) => {
  const userId = c.get("userId");
  const ev = LearnEventSchema.safeParse(await c.req.json().catch(() => null));
  if (!ev.success) return c.json({ error: "invalid learn event" }, 400);

  const d = ev.data;
  const user = await ensureUser(c.env.DB, userId);
  const garments = await listGarments(c.env.DB, userId);
  const garmentMap = new Map(garments.map((g) => [g.id, g]));

  const byIds = (ids: string[]) =>
    ids
      .map((id) => garmentMap.get(id))
      .filter((g): g is NonNullable<typeof g> => !!g);

  // Rebuild outfits from stored id-lists. Contract: pickedId is the same
  // "+"-joined garmentId string the client received in the suggestion.
  const offered = d.suggestedIds.map((ids) => ({
    garmentIds: ids,
    score: 0,
    reasons: [],
  }));
  const pickedOutfit = d.pickedId
    ? { garmentIds: d.pickedId.split("+"), score: 0, reasons: [] }
    : null;

  const nextPrefs = updatePreference(
    user.prefs,
    pickedOutfit
      ? {
          picked: pickedOutfit,
          rejected: offered.filter((o) => o !== pickedOutfit),
          garments: garmentMap,
          occasion: d.context.occasion,
        }
      : { picked: null, garments: garmentMap, occasion: d.context.occasion },
  );

  // Explore state: update posteriors for offered signatures.
  const NEUTRALS = new Set(["black", "white", "cream", "grey", "navy", "tan", "brown"]);
  const sigOf = (ids: string[]) => {
    const items = byIds(ids);
    const colors = items.flatMap((g) => g.attrs.colors);
    const isDress = items.some((g) => g.attrs.slot === "dress");
    const chromatic = colors.filter((col) => !NEUTRALS.has(col as never));
    return outfitSignature(ids, colors, isDress);
  };
  const offeredSigs = d.suggestedIds.map(sigOf);
  const pickedSig = pickedOutfit ? sigOf(pickedOutfit.garmentIds) : null;
  const nextExplore = updateExploreState(user.exploreState, pickedSig, offeredSigs);

  // Rotation: stamp last_worn_at on the picked garments.
  const batch: D1PreparedStatement[] = [
    c.env.DB
      .prepare("UPDATE users SET prefs = ?, explore_state = ? WHERE id = ?")
      .bind(JSON.stringify(nextPrefs), JSON.stringify(nextExplore), userId),
  ];
  if (pickedOutfit) {
    for (const id of pickedOutfit.garmentIds) {
      batch.push(
        c.env.DB.prepare("UPDATE garments SET last_worn_at = ? WHERE id = ? AND user_id = ?").bind(d.ts, id, userId),
      );
    }
    batch.push(
      c.env.DB
        .prepare("INSERT INTO wear_log (user_id, garment_ids, worn_at, occasion, context, ts) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(userId, JSON.stringify(pickedOutfit.garmentIds), d.ts, d.context.occasion, JSON.stringify(d.context), d.ts),
    );
    // Backfill the suggestion row's picked column.
    batch.push(
      c.env.DB
        .prepare(
          `UPDATE suggestions SET picked = ? WHERE id = (
             SELECT id FROM suggestions WHERE user_id = ? ORDER BY ts DESC LIMIT 1
           )`,
        )
        .bind(JSON.stringify(pickedOutfit.garmentIds), userId),
    );
  }
  await c.env.DB.batch(batch);
  return c.json({ ok: true, n: nextPrefs.n });
});

// ---------------------------------------------------------------------------
// Tone — per-user, per-day copy (word-bank layer; Gemini rewrites = phase 6)
// ---------------------------------------------------------------------------

app.get("/v1/tone", auth, async (c) => {
  const userId = c.get("userId");
  const user = await ensureUser(c.env.DB, userId);
  const profile = user.tone ?? { bank: "none" as const, intensity: 0 };
  const day = new Date().toISOString().slice(0, 10);

  const cached = await c.env.DB.prepare("SELECT copy FROM tone_cache WHERE user_id = ? AND day = ?")
    .bind(userId, day)
    .first();
  if (cached?.copy) {
    return c.json({ day, copy: JSON.parse(cached.copy as string), profile });
  }

  const copy: Record<string, string> = {};
  for (const key of Object.keys(BANKS.genz ?? {})) {
    copy[key] = toneText(key, profile, `${userId}:${day}`);
  }
  await c.env.DB
    .prepare(
      "INSERT INTO tone_cache (user_id, day, copy, ts) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, day) DO UPDATE SET copy = excluded.copy",
    )
    .bind(userId, day, JSON.stringify(copy), Date.now())
    .run();
  return c.json({ day, copy, profile });
});

// ---------------------------------------------------------------------------
// Photo backup (optional; photos live on-device by default)
// ---------------------------------------------------------------------------

app.post("/v1/photos/:id", auth, async (c) => {
  const id = c.req.param("id");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return c.json({ error: "bad id" }, 400);
  const body = await c.req.json().catch(() => null);
  if (typeof body?.data !== "string" || !body.data.startsWith("data:image/")) {
    return c.json({ error: "expected data URI in body.data" }, 400);
  }
  const base64 = body.data.split(",")[1];
  if (!base64) return c.json({ error: "bad data URI" }, 400);
  const key = `${c.get("userId")}/${id}.jpg`;
  await c.env.PHOTOS.put(key, base64, { httpMetadata: { contentType: "image/jpeg" } });
  return c.json({ ok: true, key });
});

export default app;
export type { Bindings, UserRow, SignatureState };
export { emptyPreference, mapGarment };
