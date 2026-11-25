/**
 * Device auth — MVP.
 *
 * One device = one user. The app generates a persistent device id
 * (expo-constants / secure-store) and calls /v1/auth/device once. We mint
 * a long-lived HS256 JWT keyed by that id. Real multi-account auth
 * (OAuth etc.) is a post-beta swap of this module only.
 */
import { SignJWT, jwtVerify } from "jose";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

/**
 * One-time device registration secret (proof-of-possession).
 * Returned to the client exactly once at first registration; only this
 * SHA-256 hex hash is stored. Re-registration for an existing user must
 * present the plaintext secret.
 */
export function generateRegistrationSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashRegistrationSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyRegistrationSecret(
  presented: string | undefined,
  storedHash: string | null,
): Promise<boolean> {
  if (!presented || !storedHash) return false;
  const presentedHash = await hashRegistrationSecret(presented);
  // Constant-time-ish compare; hex strings of equal length.
  let diff = 0;
  for (let i = 0; i < presentedHash.length; i++) {
    diff |= presentedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export async function mintToken(
  secret: string,
  deviceId: string,
  nowMs: number = Date.now(),
): Promise<string> {
  const enc = new TextEncoder();
  const key = await importKey(secret, enc);
  return new SignJWT({})
    .setSubject(deviceId)
    .setIssuedAt(Math.floor(nowMs / 1000))
    .setExpirationTime(Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS)
    .setProtectedHeader({ alg: "HS256" })
    .sign(key);
}

export async function verifyToken(
  secret: string,
  token: string,
): Promise<string | null> {
  try {
    const enc = new TextEncoder();
    const key = await importKey(secret, enc);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const sub = payload.sub;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

// Cache the imported CryptoKey per secret (Worker instances are long-lived).
let cachedSecret: string | null = null;
let cachedKey: CryptoKey | null = null;

async function importKey(secret: string, enc: TextEncoder): Promise<CryptoKey> {
  if (cachedSecret === secret && cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  cachedSecret = secret;
  return cachedKey;
}
