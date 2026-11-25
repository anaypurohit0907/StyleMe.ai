import { beforeAll, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import { makeEnv, type MockEnv } from "./mockdb";
import { updatePreference } from "@styleme/engine";

/**
 * API-surface integration test: auth → sync → recommend → laundry → learn
 * → tone, all against the in-memory D1 mock. No network, no real D1.
 */

function garment(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    attrs: {
      slot: "top",
      colors: ["blue"],
      pattern: "solid",
      fit: "regular",
      formality: 3,
      season: "all",
      material: "medium",
      ...over.attrs,
    },
    status: "available",
    photoRef: `local://${id}`,
    addedAt: Date.UTC(2026, 10, 1),
    lastWornAt: null,
    corrections: [],
    ...over,
  };
}

/** A wardrobe that produces multiple distinct outfit families. */
function testWardrobe() {
  return [
    garment("t1", { attrs: { slot: "top", colors: ["blue"], pattern: "solid", fit: "slim", formality: 3, season: "all", material: "medium" } }),
    garment("t2", { attrs: { slot: "top", colors: ["white"], pattern: "striped", fit: "relaxed", formality: 2, season: "all", material: "light" } }),
    garment("t3", { attrs: { slot: "top", colors: ["black"], pattern: "solid", fit: "regular", formality: 4, season: "all", material: "medium" } }),
    garment("b1", { attrs: { slot: "bottom", colors: ["navy"], pattern: "solid", fit: "slim", formality: 3, season: "all", material: "medium" } }),
    garment("b2", { attrs: { slot: "bottom", colors: ["tan"], pattern: "solid", fit: "relaxed", formality: 2, season: "all", material: "light" } }),
    garment("b3", { attrs: { slot: "bottom", colors: ["grey"], pattern: "solid", fit: "regular", formality: 4, season: "all", material: "medium" } }),
    garment("d1", { attrs: { slot: "dress", colors: ["pink"], pattern: "floral", fit: "regular", formality: 2, season: "all", material: "light" } }),
    garment("s1", { attrs: { slot: "shoes", colors: ["brown"], pattern: "solid", fit: "regular", formality: 3, season: "all", material: "medium" } }),
    garment("s2", { attrs: { slot: "shoes", colors: ["white"], pattern: "solid", fit: "slim", formality: 2, season: "all", material: "light" } }),
    garment("s3", { attrs: { slot: "shoes", colors: ["black"], pattern: "solid", fit: "regular", formality: 4, season: "all", material: "medium" } }),
    garment("o1", { attrs: { slot: "outerwear", colors: ["navy"], pattern: "solid", fit: "regular", formality: 4, season: "cool", material: "heavy" } }),
  ];
}

let env: MockEnv;
let token: string;
let tokenB: string;
const NOW = Date.UTC(2026, 10, 10, 9);
const USER_A = "device-test-12345678";
const USER_B = "device-tenant-99887766";

async function call(path: string, init?: RequestInit, withAuth = false, tok = token) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (withAuth) headers.authorization = `Bearer ${tok}`;
  return app.request(
    path,
    { ...init, headers },
    // hono test extra: env is the third arg
    env as never,
  );
}

beforeAll(async () => {
  env = makeEnv();
  const r = await app.request(
    "/v1/auth/device",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "device-test-12345678", onboarding: { city: "Berlin" } }),
    },
    env as never,
  );
  expect(r.status).toBe(200);
  token = (await r.json()).token as string;
});

describe("worker API", () => {
  it("health", async () => {
    const r = await app.request("/health", undefined, env as never);
    expect((await r.json()).ok).toBe(true);
  });

  it("rejects bad device ids", async () => {
    const r = await call("/v1/auth/device", {
      method: "POST",
      body: JSON.stringify({ deviceId: "short" }),
    });
    expect(r.status).toBe(400);
  });

  it("requires a valid bearer token", async () => {
    const r = await call("/v1/recommend", { method: "POST", body: JSON.stringify({}) });
    expect([401, 403]).toContain(r.status);
  });

  it("full flow: sync → recommend → laundry → learn → tone", async () => {
    // --- sync wardrobe
    const syncR = await call(
      "/v1/wardrobe/sync",
      { method: "POST", body: JSON.stringify({ upserts: testWardrobe(), deletions: [], ts: NOW }) },
      true,
    );
    expect(syncR.status).toBe(200);
    expect((await syncR.json()).applied).toBe(11);

    // --- recommend (office, 15C)
    const recR = await call(
      "/v1/recommend",
      {
        method: "POST",
        body: JSON.stringify({ occasion: "office", now: NOW, weather: { tempC: 15, isRaining: false } }),
      },
      true,
    );
    expect(recR.status).toBe(200);
    const rec = (await recR.json()) as {
      outfits: { garmentIds: string[]; reasons: { rule: string }[] }[];
      meta: { candidatesScored: number };
    };
    expect(rec.outfits.length).toBeGreaterThanOrEqual(3);
    for (const o of rec.outfits) {
      expect(o.garmentIds.length).toBeGreaterThanOrEqual(3);
      expect(o.reasons.length).toBeGreaterThan(0);
      // completeness: shoes present
      expect(o.garmentIds.some((id) => id.startsWith("s"))).toBe(true);
    }
    expect(rec.meta.candidatesScored).toBeGreaterThan(0);

    // --- put one shoe in the wash: it must disappear from candidates
    const washR = await call(
      "/v1/laundry",
      {
        method: "POST",
        body: JSON.stringify({ garmentIds: ["s1"], event: "in_wash", expectedAvailableAt: null, ts: NOW + 60_000 }),
      },
      true,
    );
    expect(washR.status).toBe(200);
    expect(env.DB.laundry.length).toBe(1);

    const rec2 = (await (
      await call(
        "/v1/recommend",
        {
          method: "POST",
          body: JSON.stringify({ occasion: "office", now: NOW + 60_000, weather: { tempC: 15, isRaining: false } }),
        },
        true,
      )
    ).json()) as { outfits: { garmentIds: string[] }[] };
    for (const o of rec2.outfits) {
      expect(o.garmentIds).not.toContain("s1");
    }

    // --- wash it back: it returns
    await call(
      "/v1/laundry",
      {
        method: "POST",
        body: JSON.stringify({ garmentIds: ["s1"], event: "washed", expectedAvailableAt: null, ts: NOW + 120_000 }),
      },
      true,
    );
    expect(env.DB.garment(USER_A, "s1")?.status).toBe("available");

    // --- learn: pick the first suggested outfit
    const pickedId = rec.outfits[0]!.garmentIds.join("+");
    const learnR = await call(
      "/v1/learn",
      {
        method: "POST",
        body: JSON.stringify({
          suggestedIds: rec.outfits.map((o) => o.garmentIds),
          pickedId,
          context: { occasion: "office", mood: "none", weather: { tempC: 15, isRaining: false }, now: NOW },
          ts: NOW,
        }),
      },
      true,
    );
    expect(learnR.status).toBe(200);
    expect((await learnR.json()).n).toBe(1);
    // rotation stamped
    for (const id of pickedId.split("+")) {
      expect(env.DB.garment(USER_A, id)?.last_worn_at).toBe(NOW);
    }
    expect(env.DB.wearLog.length).toBe(1);

    // --- tone: returns a copy map, cached per day
    const toneR = await call("/v1/tone", undefined, true);
    expect(toneR.status).toBe(200);
    const tone = await toneR.json();
    expect(typeof tone.copy.pick_one).toBe("string");
    const tone2R = await call("/v1/tone", undefined, true);
    expect((await tone2R.json()).copy).toEqual(tone.copy);
  });

  it("tenant isolation: same garment id across users — no overwrite, no cross-effects", async () => {
    // --- second device registers
    const r = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: USER_B }),
      },
      env as never,
    );
    expect(r.status).toBe(200);
    tokenB = (await r.json()).token as string;

    const aT1Before = env.DB.garment(USER_A, "t1");

    // --- B upserts the SAME id A already owns, with different attrs
    const evil = garment("t1", {
      attrs: { slot: "bottom", colors: ["red"], pattern: "floral", fit: "slim", formality: 2, season: "warm", material: "light" },
    });
    const syncB = await call(
      "/v1/wardrobe/sync",
      { method: "POST", body: JSON.stringify({ upserts: [evil], deletions: [], ts: NOW }) },
      true,
      tokenB,
    );
    expect(syncB.status).toBe(200);
    expect(JSON.parse(env.DB.garment(USER_A, "t1")!.attrs as string).colors).toEqual(["blue"]);
    expect(JSON.parse(env.DB.garment(USER_B, "t1")!.attrs as string).colors).toEqual(["red"]);
    expect(env.DB.garment(USER_A, "t1")!.attrs).toBe(aT1Before!.attrs);

    // --- B launders A's garment id → A's status must not move
    await call(
      "/v1/laundry",
      {
        method: "POST",
        body: JSON.stringify({ garmentIds: ["s1"], event: "in_wash", expectedAvailableAt: null, ts: NOW + 60_000 }),
      },
      true,
      tokenB,
    );
    expect(env.DB.garment(USER_A, "s1")?.status).toBe("available");

    // --- B learns with pickedId "t1" → rotation stamps only B's row
    await call(
      "/v1/learn",
      {
        method: "POST",
        body: JSON.stringify({
          suggestedIds: [["t1"]],
          pickedId: "t1",
          context: { occasion: "office", mood: "none", weather: { tempC: 15, isRaining: false }, now: NOW + 60_000 },
          ts: NOW + 60_000,
        }),
      },
      true,
      tokenB,
    );
    expect(env.DB.garment(USER_B, "t1")?.last_worn_at).toBe(NOW + 60_000);
    expect(env.DB.garment(USER_A, "t1")?.last_worn_at).toBe(aT1Before!.last_worn_at);

    // --- B deletes "t1" → only B's row goes
    const delB = await call(
      "/v1/wardrobe/sync",
      { method: "POST", body: JSON.stringify({ upserts: [], deletions: ["t1"], ts: NOW + 120_000 }) },
      true,
      tokenB,
    );
    expect(delB.status).toBe(200);
    expect(env.DB.garment(USER_B, "t1")).toBeUndefined();
    expect(env.DB.garment(USER_A, "t1")).toBeDefined();
  });

  it("auth proof-of-possession: one-time secret, no silent re-registration", async () => {
    const deviceId = "device-pos-11223344";
    const reg = async (initBody: Record<string, unknown>) =>
      app.request(
        "/v1/auth/device",
        {
          method: "POST",
          headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.7" },
          body: JSON.stringify(initBody),
        },
        env as never,
      );

    // First registration returns the secret exactly once + stores only a hash.
    const first = await reg({ deviceId, onboarding: { city: "Berlin" } });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { token: string; registrationSecret: string };
    expect(firstBody.registrationSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(env.DB.users.get(deviceId)?.reg_secret_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(env.DB.users.get(deviceId)?.reg_secret_hash).not.toBe(firstBody.registrationSecret);

    // Re-registration without the secret is refused — no token, no takeover.
    expect((await reg({ deviceId })).status).toBe(403);
    // Wrong secret refused too.
    expect((await reg({ deviceId, registrationSecret: "0".repeat(64) })).status).toBe(403);
    // Correct secret works.
    const again = await reg({ deviceId, registrationSecret: firstBody.registrationSecret });
    expect(again.status).toBe(200);

    // Onboarding is set at registration only: a secret-bearing re-registration
    // must not overwrite the stored onboarding.
    await reg({ deviceId, registrationSecret: firstBody.registrationSecret, onboarding: { city: "Pwned" } });
    expect(JSON.parse(env.DB.users.get(deviceId)!.onboarding as string).city).toBe("Berlin");
  });

  it("auth: legacy user without secret hash gets one-time upgrade, not lockout", async () => {
    // Pre-0003 row shape: no reg_secret_hash.
    env.DB.users.set("device-legacy-00000001", {
      id: "device-legacy-00000001",
      locale: null,
      onboarding: JSON.stringify({ city: "Oslo" }),
      tone: null,
      prefs: "{}",
      explore_state: "{}",
      created_at: 1,
      reg_secret_hash: null,
    });
    const r = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.8" },
        body: JSON.stringify({ deviceId: "device-legacy-00000001" }),
      },
      env as never,
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { token: string; registrationSecret: string };
    expect(body.registrationSecret).toMatch(/^[0-9a-f]{64}$/);
    // Upgraded: hash stored, and a second call now demands the secret.
    expect(env.DB.users.get("device-legacy-00000001")?.reg_secret_hash).toMatch(/^[0-9a-f]{64}$/);
    const r2 = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.8" },
        body: JSON.stringify({ deviceId: "device-legacy-00000001" }),
      },
      env as never,
    );
    expect(r2.status).toBe(403);
  });

  it("rate limits: auth per-IP and recommend per-user return 429", async () => {
    // Fresh IP, fresh device: 10 allowed in the window, the 11th is a 429.
    const ip = "198.51.100.9";
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const r = await app.request(
        "/v1/auth/device",
        {
          method: "POST",
          headers: { "content-type": "application/json", "cf-connecting-ip": ip },
          body: JSON.stringify({ deviceId: "device-rl-0000000001" }),
        },
        env as never,
      );
      lastStatus = r.status;
    }
    expect(lastStatus).toBe(429);

    // Authed surface: fresh user hammers /v1/recommend — cap is 10/min.
    const reg = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.10" },
        body: JSON.stringify({ deviceId: "device-rl-0000000002" }),
      },
      env as never,
    );
    const tok = ((await reg.json()) as { token: string }).token;
    let recStatus = 0;
    for (let i = 0; i < 11; i++) {
      const r = await app.request(
        "/v1/recommend",
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
          body: JSON.stringify({ occasion: "office", now: NOW, weather: { tempC: 15, isRaining: false } }),
        },
        env as never,
      );
      recStatus = r.status;
    }
    expect(recStatus).toBe(429);
  });

  it("recommend: invalid occasion is a 400, not a 500", async () => {
    const r = await call(
      "/v1/recommend",
      {
        method: "POST",
        body: JSON.stringify({
          occasion: "zero-gravity gala",
          now: NOW,
          weather: { tempC: 15, isRaining: false },
        }),
      },
      true,
    );
    expect(r.status).toBe(400);
    const body = (await r.json()) as { error: string };
    expect(body.error).toContain("invalid recommend context");
  });

  it("learn: the picked outfit is not also counted as rejected", async () => {
    // Fresh user so preference math starts from zero.
    const reg = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.11" },
        body: JSON.stringify({ deviceId: "device-learn-00000001" }),
      },
      env as never,
    );
    const tok = ((await reg.json()) as { token: string }).token;
    const USER = "device-learn-00000001";
    const w = [
      garment("lt1"),
      garment("lb1", { attrs: { slot: "bottom", colors: ["navy"], pattern: "solid", fit: "slim", formality: 3, season: "all", material: "medium" } }),
      garment("ls1", { attrs: { slot: "shoes", colors: ["brown"], pattern: "solid", fit: "regular", formality: 3, season: "all", material: "medium" } }),
    ];
    const sync = await app.request(
      "/v1/wardrobe/sync",
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
        body: JSON.stringify({ upserts: w, deletions: [], ts: NOW }),
      },
      env as never,
    );
    expect(sync.status).toBe(200);

    const rec = (await (
      await app.request(
        "/v1/recommend",
        {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
          body: JSON.stringify({ occasion: "office", now: NOW, weather: { tempC: 15, isRaining: false } }),
        },
        env as never,
      )
    ).json()) as { outfits: { garmentIds: string[] }[] };
    expect(rec.outfits.length).toBeGreaterThan(0);

    const pickedId = rec.outfits[0]!.garmentIds.join("+");
    // Baseline preference vector as stored before the learn call.
    const baseline = JSON.parse(env.DB.users.get(USER)!.prefs as string);
    const learnR = await app.request(
      "/v1/learn",
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          suggestedIds: rec.outfits.map((o) => o.garmentIds),
          pickedId,
          context: { occasion: "office", mood: "none", weather: { tempC: 15, isRaining: false }, now: NOW },
          ts: NOW,
        }),
      },
      env as never,
    );
    expect(learnR.status).toBe(200);

    // Expected preferences use correct semantics: rejected = offered minus
    // picked (by id), not by object identity.
    const garmentMap = new Map(w.map((g) => [g.id, g]));
    const expected = updatePreference(baseline, {
      picked: { garmentIds: rec.outfits[0]!.garmentIds, score: 0, reasons: [] },
      rejected: rec.outfits.slice(1).map((o) => ({ garmentIds: o.garmentIds, score: 0, reasons: [] })),
      garments: garmentMap,
      occasion: "office",
    });
    const actual = JSON.parse(env.DB.users.get(USER)!.prefs as string);
    expect(actual).toEqual(expected);
  });

  it("weather cache: bounded at MAX_CACHE_ENTRIES entries", async () => {
    const fakeFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ current: { temperature_2m: 20, precipitation: 0 } }),
    }));
    vi.stubGlobal("fetch", fakeFetch);
    try {
      const cache = new Map<string, { weather: { tempC: number; isRaining: boolean }; at: number }>();
      const { fetchWeather } = await import("../src/weather");
      for (let i = 0; i < 1005; i++) {
        await fetchWeather(cache as never, undefined, i * 0.01, i * 0.01);
      }
      expect(cache.size).toBeLessThanOrEqual(1000);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("registration race: losing the INSERT race means 403, not 500", async () => {
    const deviceId = "device-race-000000001";
    // The racer won: the row exists with their hash…
    env.DB.users.set(deviceId, {
      id: deviceId,
      locale: null,
      onboarding: null,
      tone: null,
      prefs: "{}",
      explore_state: "{}",
      created_at: 1,
      reg_secret_hash: "a".repeat(64),
    });
    // …but this caller's pre-check reads stale (race window modeled by the mock).
    env.DB.suppressUserGetOnce = deviceId;
    const r = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.12" },
        body: JSON.stringify({ deviceId }),
      },
      env as never,
    );
    expect(r.status).toBe(403);
    // The winner's hash survives — the loser must not have overwritten it.
    expect(env.DB.users.get(deviceId)?.reg_secret_hash).toBe("a".repeat(64));
  });

  it("payload caps: oversized or malformed syncs are 400s", async () => {
    // 501 upserts > cap.
    const many = Array.from({ length: 501 }, (_, i) => garment(`bulk${i}`));
    const tooMany = await call(
      "/v1/wardrobe/sync",
      { method: "POST", body: JSON.stringify({ upserts: many, deletions: [], ts: NOW }) },
      true,
    );
    expect(tooMany.status).toBe(400);

    // Bad garment id charset (also guards the "+"-joined pickedId contract).
    const badId = await call(
      "/v1/wardrobe/sync",
      {
        method: "POST",
        body: JSON.stringify({ upserts: [{ ...garment("t1"), id: "bad id+" }], deletions: [], ts: NOW }),
      },
      true,
    );
    expect(badId.status).toBe(400);

    // Oversized embedding.
    const badEmbedding = await call(
      "/v1/wardrobe/sync",
      {
        method: "POST",
        body: JSON.stringify({
          upserts: [{ ...garment("t1"), embedding: "A".repeat(5000) }],
          deletions: [],
          ts: NOW,
        }),
      },
      true,
    );
    expect(badEmbedding.status).toBe(400);
  });

  it("recommend: weather outside physical bounds is a 400", async () => {
    const r = await call(
      "/v1/recommend",
      {
        method: "POST",
        body: JSON.stringify({ occasion: "office", now: NOW, weather: { tempC: 100, isRaining: false } }),
      },
      true,
    );
    expect(r.status).toBe(400);
  });

  it("auth: junk onboarding is a 400, shaped onboarding passes", async () => {
    const junk = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.13" },
        body: JSON.stringify({ deviceId: "device-onb-000000001", onboarding: { deep: { nested: { blob: true } } } }),
      },
      env as never,
    );
    expect(junk.status).toBe(400);

    const ok = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.13" },
        body: JSON.stringify({ deviceId: "device-onb-000000002", onboarding: { city: "Berlin", laundry: "weekly" } }),
      },
      env as never,
    );
    expect(ok.status).toBe(200);
    expect(JSON.parse(env.DB.users.get("device-onb-000000002")!.onboarding as string).city).toBe("Berlin");
  });

  it("ScoredOutfit contract: dress+shoes (2 ids) is valid, 1 id is not", async () => {
    const { ScoredOutfitSchema } = await import("@styleme/schema");
    const two = ScoredOutfitSchema.safeParse({
      garmentIds: ["d1", "s1"],
      score: 0.5,
      reasons: [{ rule: "r", score: 0.5, text: "t" }],
    });
    expect(two.success).toBe(true);
    const one = ScoredOutfitSchema.safeParse({
      garmentIds: ["d1"],
      score: 0.5,
      reasons: [{ rule: "r", score: 0.5, text: "t" }],
    });
    expect(one.success).toBe(false);
  });

  it("payload caps round 2: learn/laundry/corrections/photo refs all bounded", async () => {
    const ctx = { occasion: "office", mood: "none", weather: { tempC: 15, isRaining: false }, now: NOW };
    const outfit = ["t1", "b1", "s1"];

    // learn: > 20 offered outfits → 400
    const tooManyOffers = await call(
      "/v1/learn",
      {
        method: "POST",
        body: JSON.stringify({
          suggestedIds: Array.from({ length: 21 }, () => outfit),
          pickedId: outfit.join("+"),
          context: ctx,
          ts: NOW,
        }),
      },
      true,
    );
    expect(tooManyOffers.status).toBe(400);

    // learn: absurd pickedId → 400
    const longPicked = await call(
      "/v1/learn",
      {
        method: "POST",
        body: JSON.stringify({ suggestedIds: [outfit], pickedId: "x".repeat(600), context: ctx, ts: NOW }),
      },
      true,
    );
    expect(longPicked.status).toBe(400);

    // laundry: > 100 ids → 400
    const bigLaundry = await call(
      "/v1/laundry",
      {
        method: "POST",
        body: JSON.stringify({ garmentIds: Array.from({ length: 101 }, (_, i) => `g${i}`), event: "in_wash", expectedAvailableAt: null, ts: NOW }),
      },
      true,
    );
    expect(bigLaundry.status).toBe(400);

    // sync: oversized correction strings → 400
    const badCorrection = await call(
      "/v1/wardrobe/sync",
      {
        method: "POST",
        body: JSON.stringify({
          upserts: [
            {
              ...garment("t1"),
              corrections: [{ field: "nickname", from: "x".repeat(100), to: "y", at: NOW }],
            },
          ],
          deletions: [],
          ts: NOW,
        }),
      },
      true,
    );
    expect(badCorrection.status).toBe(400);

    // sync: oversized photoRef → 400
    const badRef = await call(
      "/v1/wardrobe/sync",
      {
        method: "POST",
        body: JSON.stringify({ upserts: [{ ...garment("t1"), photoRef: "local://" + "z".repeat(600) }], deletions: [], ts: NOW }),
      },
      true,
    );
    expect(badRef.status).toBe(400);
  });

  it("T-045: laundry/tone/photos rate-limited; photos body capped at 2 MB", async () => {
    // Fresh device so its buckets start empty.
    const reg = await app.request(
      "/v1/auth/device",
      {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.14" },
        body: JSON.stringify({ deviceId: "device-t045-00000001" }),
      },
      env as never,
    );
    const tok = ((await reg.json()) as { token: string }).token;
    const hdrs = { "content-type": "application/json", authorization: `Bearer ${tok}` };

    // laundry: 30/min — 11 calls is under, so hit it with 31 small events.
    let last = 0;
    for (let i = 0; i < 31; i++) {
      const r = await app.request(
        "/v1/laundry",
        { method: "POST", headers: hdrs, body: JSON.stringify({ garmentIds: ["t1"], event: "in_wash", expectedAvailableAt: null, ts: NOW }) },
        env as never,
      );
      last = r.status;
    }
    expect(last).toBe(429);

    // tone: 10/min.
    let toneLast = 0;
    for (let i = 0; i < 11; i++) {
      const r = await app.request("/v1/tone", { headers: hdrs }, env as never);
      toneLast = r.status;
    }
    expect(toneLast).toBe(429);

    // photos: oversized data URI → 413 before any storage work.
    const big = "data:image/jpeg;base64," + "A".repeat(2 * 1024 * 1024 + 1);
    const tooBig = await app.request(
      "/v1/photos/p1",
      { method: "POST", headers: hdrs, body: JSON.stringify({ data: big }) },
      env as never,
    );
    expect(tooBig.status).toBe(413);

    // photos: small valid data URI still accepted (mock R2).
    const ok = await app.request(
      "/v1/photos/p1",
      { method: "POST", headers: hdrs, body: JSON.stringify({ data: "data:image/jpeg;base64,aGVsbG8=" }) },
      env as never,
    );
    expect(ok.status).toBe(200);
  });
});
