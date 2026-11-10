/**
 * StyleMe API client (Cloudflare Worker).
 *
 * Base URL: in dev point this at `wrangler dev` (http://<your-lan-ip>:8787).
 * The device id doubles as the user id; the token is minted once and cached.
 *
 * All calls are best-effort: the app works offline (local wardrobe + last
 * good recommendations), the worker is for fresh "Today" + learning sync.
 */
import type {
  LaundryEvent,
  LearnEvent,
  Occasion,
  RecommendContext,
  ScoredOutfit,
  ToneProfile,
  WardrobeSync,
} from "@styleme/schema";
import { metaGet, metaSet } from "./db";

const DEFAULT_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://192.168.1.10:8787"; // set EXPO_PUBLIC_API_BASE for your wrangler dev IP / deployed URL
export const API_BASE: string = DEFAULT_BASE;

let token: string | null = null;

async function ensureAuth(deviceId: string, onboarding?: Record<string, unknown>): Promise<string> {
  if (token) return token;
  const cached = await metaGet("token");
  if (cached) {
    token = cached;
    return cached;
  }
  const res = await fetch(`${API_BASE}/v1/auth/device`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId, onboarding }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const body = (await res.json()) as { token: string };
  token = body.token;
  await metaSet("token", body.token);
  return body.token;
}

async function call<T>(path: string, init: RequestInit, deviceId: string): Promise<T> {
  const t = await ensureAuth(deviceId);
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${t}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`api ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// --- endpoints ---------------------------------------------------------------

export async function syncWardrobe(
  deviceId: string,
  sync: WardrobeSync,
): Promise<{ applied: number }> {
  return call("/v1/wardrobe/sync", { method: "POST", body: JSON.stringify(sync) }, deviceId);
}

export interface TodayResult {
  outfits: ScoredOutfit[];
  context: RecommendContext;
  note?: string;
  meta?: { candidatesScored: number; missingSlots: string[] };
}

export async function getToday(
  deviceId: string,
  occasion: Occasion,
  city?: string,
): Promise<TodayResult> {
  return call<TodayResult>(
    "/v1/recommend",
    { method: "POST", body: JSON.stringify({ occasion, city, now: Date.now() }) },
    deviceId,
  );
}

export async function sendLaundry(deviceId: string, ev: LaundryEvent): Promise<void> {
  await call("/v1/laundry", { method: "POST", body: JSON.stringify(ev) }, deviceId);
}

export async function sendLearn(deviceId: string, ev: LearnEvent): Promise<void> {
  await call("/v1/learn", { method: "POST", body: JSON.stringify(ev) }, deviceId);
}

export async function getTone(deviceId: string): Promise<{
  copy: Record<string, string>;
  profile: ToneProfile;
}> {
  return call("/v1/tone", { method: "GET" }, deviceId);
}

/**
 * Tone copy with graceful degradation: if the API is unreachable, fall back
 * to the bundled word banks (classic) so the UI never blocks on the network.
 */
export async function toneText(key: string, deviceId: string, fallback: string): Promise<string> {
  try {
    const { copy } = await getTone(deviceId);
    return copy[key] ?? fallback;
  } catch {
    return fallback;
  }
}
