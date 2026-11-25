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

export type AuthErrorCode = "registration_locked" | "auth_failed";

/** Typed auth failure so callers can distinguish a lost registration secret
 * (recover with a fresh device id) from a generic worker/network failure. */
export class AuthError extends Error {
  readonly status: number;
  readonly code: AuthErrorCode;

  constructor(message: string, status: number, code: AuthErrorCode) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

let authInFlight: Promise<string> | null = null;

async function ensureAuth(deviceId: string, onboarding?: Record<string, unknown>): Promise<string> {
  if (token) return token;
  if (authInFlight) return authInFlight;
  // Serialize concurrent first calls: two register requests from the same
  // install would race the worker's first-registration INSERT.
  authInFlight = authenticate(deviceId, onboarding).finally(() => {
    authInFlight = null;
  });
  return authInFlight;
}

async function authenticate(deviceId: string, onboarding?: Record<string, unknown>): Promise<string> {
  const cached = await metaGet("token");
  if (cached) {
    token = cached;
    return cached;
  }
  const registrationSecret = await metaGet("registrationSecret");
  const res = await fetch(`${API_BASE}/v1/auth/device`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      deviceId,
      onboarding,
      ...(registrationSecret ? { registrationSecret } : {}),
    }),
  });
  if (res.status === 403) {
    token = null;
    throw new AuthError(
      "This device is already registered and its saved sign-in secret is missing or invalid. Reset the app identity to reconnect.",
      403,
      "registration_locked",
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AuthError(
      `auth failed: ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`,
      res.status,
      "auth_failed",
    );
  }
  const body = (await res.json()) as {
    token: string;
    userId?: string;
    registrationSecret?: string;
  };
  // Persist the one-time secret before the token: if the second write fails,
  // the next attempt can still prove possession and recover the account.
  if (body.registrationSecret) {
    await metaSet("registrationSecret", body.registrationSecret);
  }
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
