import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index";
import { makeEnv, type MockEnv } from "./mockdb";

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
const NOW = Date.UTC(2026, 10, 10, 9);

async function call(path: string, init?: RequestInit, withAuth = false) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (withAuth) headers.authorization = `Bearer ${token}`;
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
    expect(env.DB.garments.get("s1")?.status).toBe("available");

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
      expect(env.DB.garments.get(id)?.last_worn_at).toBe(NOW);
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
});
