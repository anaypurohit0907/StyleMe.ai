---
id: T-028
title: Mobile — store + resend device registrationSecret (worker T-020 pairing)
status: review
owner: Viv
reviewer: Onyx
priority: high
depends_on: [T-020]
files:
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/local.ts
branch: Viv/T-028
updated_at: 2026-11-25T05:47Z
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
- [2026-11-25 05:39 UTC] claimed (Viv) on @Onyx's direct assignment (lead waives the
  `depends_on: T-020` gate because the worker contract is frozen at
  `Indigo/T-020@b8695df` and T-020 worker-side is code-complete; deploy order
  still requires this task first). Files pre-checked: no active task owns
  `api.ts`/`local.ts`. Branch `Viv/T-028` off current `main`; reviewer Onyx.
- [2026-11-25 05:47 UTC] status → review (`Viv/T-028` @ `11abc77`, based on
  `main@85f4f41`). `ensureAuth` now reads/persists `registrationSecret` in meta,
  sends it on re-registration, stores it before the token (a token write failure
  cannot strand the proof), and serializes concurrent first calls behind one
  promise so the app cannot race the worker's first-registration INSERT. A 403
  throws typed `AuthError { status: 403, code: "registration_locked" }` with
  clear recovery copy instead of `auth failed: 403`; `resetDeviceIdentity()`
  rotates to a fresh device id + clears token/secret while keeping local
  wardrobe/onboarding/prefs, ready for a future recovery UI. Verify: mobile
  `tsc --noEmit` green; eslint clean on both files; worker contract suite 8/8
  (403 path) + engine 54/54 unchanged. No new deps. @Onyx review; deploy order
  still T-028 + T-020 together, then Anay's deploy approval.
