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
import { HTTPException } from "hono/http-exception";
import {
  emptyPreference,
  LaundryEventSchema,
  LearnEventSchema,
  OnboardingSchema,
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
import { mintToken, verifyToken, generateRegistrationSecret, hashRegistrationSecret, verifyRegistrationSecret } from "./auth";
import {
  ensureUser,
  getUser,
  listGarments,
  mapGarment,
  setUserRegSecretHash,
  syncWardrobe,
  type UserRow,
} from "./db";
import { createWeatherCache, fetchWeather } from "./weather";

interface Bindings {
  DB: D1Database;
  PHOTOS?: R2Bucket;
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
// Rate limiting (in-memory, isolate-local — fine for the free tier)
// ---------------------------------------------------------------------------

const RATE_BUCKETS = new Map<string, { n: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;

/** Fixed-window limiter. true = allowed, false = over the per-minute cap. */
function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    // Opportunistic prune so the map cannot grow unbounded in a warm isolate.
    if (RATE_BUCKETS.size > 10_000) {
      for (const [k, v] of RATE_BUCKETS) {
        if (now - v.windowStart >= RATE_WINDOW_MS) RATE_BUCKETS.delete(k);
      }
    }
    RATE_BUCKETS.set(key, { n: 1, windowStart: now });
    return true;
  }
  bucket.n += 1;
  return bucket.n <= maxPerMinute;
}

function clientIp(c: { req: { header(name: string): string | undefined } }): string {
  return c.req.header("cf-connecting-ip") ?? "unknown";
}

// Never leak stack traces; tests assert on status + shape, not prose.
// Hono's own HTTPExceptions (401 from bearerAuth, 404s) keep their response.
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error("unhandled error:", err);
  return c.json({ error: "internal error" }, 500);
});

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
  // Unauthenticated surface: throttle hard per IP and per device id so a
  // spam loop cannot burn the D1 budget.
  if (!rateLimit(`auth:ip:${clientIp(c)}`, 10) || !rateLimit(`auth:dev:${deviceId}`, 10)) {
    return c.json({ error: "rate limited" }, 429);
  }
  const registrationSecret = typeof body?.registrationSecret === "string" ? body.registrationSecret : undefined;
  // Onboarding is free-form but bounded — reject junk before it reaches D1.
  let onboarding: Record<string, unknown> | undefined;
  if (body?.onboarding !== undefined && body?.onboarding !== null) {
    const parsedOnboarding = OnboardingSchema.safeParse(body.onboarding);
    if (!parsedOnboarding.success) {
      return c.json({ error: "invalid onboarding", issues: parsedOnboarding.error.issues.slice(0, 3) }, 400);
    }
    onboarding = parsedOnboarding.data as Record<string, unknown>;
  }
  const existing = await getUser(c.env.DB, deviceId);
  if (existing) {
    // Proof-of-possession: never re-register silently for an existing user.
    // Legacy rows (pre-0003, NULL hash) get a one-time upgrade instead of a
    // lockout: fresh secret minted + returned at first re-contact.
    if (existing.regSecretHash === null) {
      const secret = generateRegistrationSecret();
      await setUserRegSecretHash(c.env.DB, deviceId, await hashRegistrationSecret(secret));
      const token = await mintToken(c.env.JWT_SECRET, deviceId);
      return c.json({ token, userId: deviceId, registrationSecret: secret });
    }
    if (!(await verifyRegistrationSecret(registrationSecret, existing.regSecretHash))) {
      return c.json({ error: "device already registered; valid registrationSecret required" }, 403);
    }
    const token = await mintToken(c.env.JWT_SECRET, deviceId);
    return c.json({ token, userId: deviceId });
  }
  // First registration: onboarding is stored only here (an attacker knowing
  // the device id must not be able to overwrite the real user's onboarding),
  // and the one-time secret is returned exactly once. If a concurrent call
  // wins the INSERT race, created=false and the existing-user rules apply.
  const secret = generateRegistrationSecret();
  const { user: created, created: won } = await ensureUser(
    c.env.DB,
    deviceId,
    onboarding,
    undefined,
    await hashRegistrationSecret(secret),
  );
  if (!won) {
    if (created.regSecretHash === null) {
      // Racer created a legacy-shaped row (no hash): upgrade path.
      const upgradeSecret = generateRegistrationSecret();
      await setUserRegSecretHash(c.env.DB, deviceId, await hashRegistrationSecret(upgradeSecret));
      const token = await mintToken(c.env.JWT_SECRET, deviceId);
      return c.json({ token, userId: deviceId, registrationSecret: upgradeSecret });
    }
    if (!(await verifyRegistrationSecret(registrationSecret, created.regSecretHash))) {
      return c.json({ error: "device already registered; valid registrationSecret required" }, 403);
    }
    const token = await mintToken(c.env.JWT_SECRET, deviceId);
    return c.json({ token, userId: deviceId });
  }
  const token = await mintToken(c.env.JWT_SECRET, deviceId);
  return c.json({ token, userId: deviceId, registrationSecret: secret });
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
  const userId = c.get("userId");
  if (!rateLimit(`sync:${userId}`, 30)) return c.json({ error: "rate limited" }, 429);
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
  if (!rateLimit(`rec:${userId}`, 10)) return c.json({ error: "rate limited" }, 429);
  const body = await c.req.json().catch(() => ({}));

  const { user } = await ensureUser(c.env.DB, userId);
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
  const contextParsed = RecommendContextSchema.safeParse({ ...partial, weather });
  if (!contextParsed.success) {
    return c.json({ error: "invalid recommend context", issues: contextParsed.error.issues.slice(0, 5) }, 400);
  }
  const context = contextParsed.data;

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
  if (!rateLimit(`learn:${userId}`, 30)) return c.json({ error: "rate limited" }, 429);
  const ev = LearnEventSchema.safeParse(await c.req.json().catch(() => null));
  if (!ev.success) return c.json({ error: "invalid learn event" }, 400);

  const d = ev.data;

  // Idempotent delivery (T-041): a retried job id applies exactly once.
  if (d.jobId) {
    const seen = await c.env.DB.prepare(
      "INSERT OR IGNORE INTO learn_events (id, user_id, ts) VALUES (?, ?, ?)",
    ).bind(d.jobId, userId, d.ts).run();
    if (!seen.meta.changes) return c.json({ ok: true, deduped: true });
    // Opportunistic prune — one cheap delete per accepted event.
    await c.env.DB.prepare(
      "DELETE FROM learn_events WHERE user_id = ? AND ts < ?",
    ).bind(userId, d.ts - 30 * 24 * 3600 * 1000).run();
  }

  const { user } = await ensureUser(c.env.DB, userId);
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
          // Compare by joined id string: the old object-identity filter
          // (`o !== pickedOutfit`) never matched separate literals, so the
          // picked outfit got both the +1 pick nudge and the −0.35 rejection
          // nudge — learning ran at ~65% of intended (audit §6, T-020 item 6).
          picked: pickedOutfit,
          rejected: offered.filter((o) => o.garmentIds.join("+") !== d.pickedId),
          garments: garmentMap,
          occasion: d.context.occasion,
        }
      : { picked: null, garments: garmentMap, occasion: d.context.occasion },
  );

  // Explore state: update posteriors for offered signatures.
  const sigOf = (ids: string[]) => {
    const items = byIds(ids);
    const colors = items.flatMap((g) => g.attrs.colors);
    const isDress = items.some((g) => g.attrs.slot === "dress");
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
  const { user } = await ensureUser(c.env.DB, userId);
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
  if (!c.env.PHOTOS) {
    return c.json({ error: "photo storage is not configured (R2 disabled)" }, 503);
  }
  const key = `${c.get("userId")}/${id}.jpg`;
  await c.env.PHOTOS.put(key, base64, { httpMetadata: { contentType: "image/jpeg" } });
  return c.json({ ok: true, key });
});

export default app;
export type { Bindings, UserRow, SignatureState };
export { emptyPreference, mapGarment };
