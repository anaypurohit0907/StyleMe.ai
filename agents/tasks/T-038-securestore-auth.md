---
id: T-038
title: Move auth token + registrationSecret to SecureStore
status: done
owner: Viv
reviewer: Onyx
priority: medium
depends_on: [T-028]
files:
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/local.ts
branch: Viv/T-038
updated_at: 2026-11-25T07:25Z
---

## Goal

`expo-secure-store` is installed but unused; the 1-year JWT and the device
`registrationSecret` live in the plain SQLite `meta` table. Move both to
SecureStore (with a one-time migration from `meta`), keep `deviceId` in
SQLite, and make `resetDeviceIdentity()` delete the secure entries. No
behavior change for honest clients; worker contract unchanged.

## Log (append-only)

- [2026-11-25 05:58 UTC] created (Onyx, from T-028 review note (c)).
- [2026-11-25 07:10 UTC] claimed (Viv) per Onyx's earlier assignment; T-018 waits
  because its `index.tsx` is owned by Marlow's active T-015. Branch `Viv/T-038`
  off current main; reviewer Onyx. Scope includes the review note that
  `resetDeviceIdentity()` must also clear the in-memory token cache.
  `db.ts` dropped from the file list before first touch: Coco's active T-017
  owns it for wear history, so the SecureStore helpers live in `api.ts` and
  use the existing `getDb`/meta reads (no write conflict).
- [2026-11-25 07:20 UTC] status → review (`Viv/T-038` @ `8dee0d7`, based on
  `main@5f449e0`). `api.ts` owns the storage layer: `getAuthItem` tries
  SecureStore, falls back to the legacy `meta` row once, then migrates and
  deletes the plaintext row (`getDb().runAsync("DELETE FROM meta …")`);
  `setAuthItem` writes secure first and only falls back to SQLite where
  SecureStore is absent (web); `deleteAuthItem` clears both. Token + secret
  keys use the documented `styleme.auth.*` form, no auth behavior change.
  `resetDeviceIdentity()` now clears both secure entries + `clearAuthCache()`
  (module token and in-flight promise) before rotating the device id — the
  T-028 review note is closed. Verify: mobile `tsc --noEmit` green; eslint 0 on
  both files; `expo-secure-store ~58.0.3` already installed (no dep/lock churn);
  native write path needs the device pass after the next CI APK. @Onyx review.
- [2026-11-25 07:25 UTC] lead review (Onyx, `8dee0d7` → merge `2e63121`): **APPROVE**. SecureStore first with SQLite fallback (web), lazy one-time migration deletes the plaintext meta rows, reset clears secure entries + module token/in-flight cache. No stale `metaGet("token")` readers remain; no circular import. Merge-result mobile tsc + eslint clean. Native Keychain/Keystore write path still needs the device pass on the next CI APK (web fallback reasoned). T-038 done.
