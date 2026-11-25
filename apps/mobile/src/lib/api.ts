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
import * as SecureStore from "expo-secure-store";
import { getDb, metaGet, metaSet } from "./db";

const DEFAULT_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://192.168.1.10:8787"; // set EXPO_PUBLIC_API_BASE for your wrangler dev IP / deployed URL
export const API_BASE: string = DEFAULT_BASE;

type AuthItem = "token" | "registrationSecret";

const SECURE_KEYS: Record<AuthItem, string> = {
  token: "styleme.auth.token",
  registrationSecret: "styleme.auth.registrationSecret",
};

let secureStoreAvailable: Promise<boolean> | null = null;

function canUseSecureStore(): Promise<boolean> {
  if (!secureStoreAvailable) {
    secureStoreAvailable = SecureStore.isAvailableAsync().catch(() => false);
  }
  return secureStoreAvailable;
}

/** One-time cleanup of the plaintext value after a successful secure write. */
async function deleteLegacyMeta(key: AuthItem): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM meta WHERE key = ?", key);
}

async function secureGet(item: AuthItem): Promise<string | null> {
  if (!(await canUseSecureStore())) return null;
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS[item]);
  } catch {
    return null;
  }
}

async function secureSet(item: AuthItem, value: string): Promise<boolean> {
  if (!(await canUseSecureStore())) return false;
  try {
    await SecureStore.setItemAsync(SECURE_KEYS[item], value);
    return true;
  } catch {
    return false;
  }
}

async function secureDelete(item: AuthItem): Promise<void> {
  if (!(await canUseSecureStore())) return;
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS[item]);
  } catch {
    // Missing/invalidated key is already deleted for our purposes.
  }
}

/** Read a token/secret from SecureStore, migrating the legacy SQLite value once. */
export async function getAuthItem(item: AuthItem): Promise<string | null> {
  const secure = await secureGet(item);
  if (secure) return secure;
  const legacy = await metaGet(item);
  if (!legacy) return null;
  if (await secureSet(item, legacy)) {
    await deleteLegacyMeta(item).catch(() => {});
  }
  return legacy;
}

/** Write to SecureStore; only fall back to SQLite where the platform has none. */
export async function setAuthItem(item: AuthItem, value: string): Promise<void> {
  if (await secureSet(item, value)) {
    await deleteLegacyMeta(item).catch(() => {});
    return;
  }
  await metaSet(item, value);
}

export async function deleteAuthItem(item: AuthItem): Promise<void> {
  await secureDelete(item);
  await deleteLegacyMeta(item).catch(() => {});
}

let token: string | null = null;

/** Drop the module-level token so a recovery/rotation takes effect immediately. */
export function clearAuthCache(): void {
  token = null;
  authInFlight = null;
}

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

// --- registration_locked signal (T-059) -------------------------------------
// Single choke point: authenticate() is the only place a lost/invalid
// registration secret turns into a typed 403. Screens subscribe and offer
// the consent-gated recovery (resetDeviceIdentity); the api layer never
// resets anything on its own.

type AuthLockedListener = () => void;
const authLockedListeners = new Set<AuthLockedListener>();

/** Subscribe to "this device's worker registration is locked" events. Returns an unsubscribe fn. */
export function onAuthLocked(listener: AuthLockedListener): () => void {
  authLockedListeners.add(listener);
  return () => authLockedListeners.delete(listener);
}

function notifyAuthLocked(): void {
  for (const listener of authLockedListeners) {
    try {
      listener();
    } catch {
      // A broken listener must never break auth.
    }
  }
}

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
  const cached = await getAuthItem("token");
  if (cached) {
    token = cached;
    return cached;
  }
  const registrationSecret = await getAuthItem("registrationSecret");
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
    notifyAuthLocked();
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
    await setAuthItem("registrationSecret", body.registrationSecret);
  }
  token = body.token;
  await setAuthItem("token", body.token);
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
