---
id: T-028
title: Mobile — store + resend device registrationSecret (worker T-020 pairing)
status: backlog
owner:
priority: high
depends_on: [T-020]
files:
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/local.ts
updated_at: 2026-11-24T20:04Z
---

## Goal

T-020's proof-of-possession changed `/v1/auth/device`: first registration
now returns `registrationSecret` (one-time, 64-hex) and re-registration for
an existing user requires it in the body (`registrationSecret`), else 403.
The app must: (1) persist the secret next to the token
(`metaSet("registrationSecret", …)` — SecureStore if available, same lane as
deviceId/token today); (2) `ensureAuth` sends it in the register body
whenever present; (3) on 403 from auth (secret lost/rotated), surface a
clear error instead of an opaque `auth failed: 403` — user must re-onboard
under a fresh device id (accept + handle that flow honestly). Until this
lands, a wiped-app reinstall on an existing device id cannot re-register.
Old APKs in the field: first fresh contact with the new worker either
registers fine (new id) or upgrades legacy rows (secret minted at first
re-contact) — no lockout, but only this task makes re-register recoverable.

## Log (append-only)

- [2026-11-24 20:04 UTC] created (Indigo, follow-up surfaced by T-020 auth hardening).
