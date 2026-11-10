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
