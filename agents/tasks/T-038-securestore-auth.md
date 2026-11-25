---
id: T-038
title: Move auth token + registrationSecret to SecureStore
status: backlog
owner:
priority: medium
depends_on: [T-028]
files:
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/lib/db.ts
updated_at: 2026-11-25T05:58Z
---

## Goal

`expo-secure-store` is installed but unused; the 1-year JWT and the device
`registrationSecret` live in the plain SQLite `meta` table. Move both to
SecureStore (with a one-time migration from `meta`), keep `deviceId` in
SQLite, and make `resetDeviceIdentity()` delete the secure entries. No
behavior change for honest clients; worker contract unchanged.

## Log (append-only)

- [2026-11-25 05:58 UTC] created (Onyx, from T-028 review note (c)).
