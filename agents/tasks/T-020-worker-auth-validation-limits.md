---
id: T-020
title: Worker auth hardening, validation, rate limits
status: backlog
owner:
priority: critical
depends_on: [T-019]
files:
  - apps/worker/src/index.ts
  - apps/worker/src/auth.ts
  - apps/worker/src/weather.ts
  - apps/worker/tests/worker.test.ts
  - packages/schema/src/index.ts
updated_at: 2026-11-24T19:29Z
---

## Goal

Audit §6 F2–F5 on a live URL: (1) `/v1/auth/device` mints a 1-year JWT on
deviceId alone (`index.ts:66-79`) — knowing a device id = permanent
takeover, plus it overwrites the victim's onboarding every call. Add
device proof-of-possession: keep deviceId + a one-time registration secret
returned only at first registration (or a signed install attestation if
simple), never accept re-registration silently for existing users;
(2) rate limiting middleware (per-deviceId + per-IP buckets, in-memory
isolate-local is fine for free tier) on auth + sync + recommend + learn —
an unauthenticated loop must not burn the D1/Open-Meteo daily budget;
(3) zod-validate the `/v1/recommend` body (bad occasion → 400, not an
unhandled ZodError 500); add `app.onError`; (4) payload caps in
`packages/schema`: `WardrobeSync.upserts/.deletions` max lengths, tighter
`Garment.id` format/max, `embedding` max length, an `onboarding` object
schema, `weather.tempC` sane bounds; (5) cap the weather-cache Map size
(`weather.ts:15-28` grows unbounded per isolate). Keep tests honest: no
new false-green mock paths. **Two correctness bugs from the engine audit,
same files:** (6) `/v1/learn` builds `rejected` with object-identity
filtering (`offered.filter((o) => o !== pickedOutfit)` — separate object
literals, never filters, `index.ts:206-224`) so the picked outfit gets both
the +1 pick nudge and the −0.35 rejection nudge — learning runs at ~65%
of intended; fix by index/id comparison and add a regression test; (7)
`ScoredOutfitSchema.garmentIds` is `min(3)` but the engine legitimately
emits dress+shoes outfits (2 ids) on warm days — latent contract break for
any validating consumer; relax to `min(2)` with a test.
Coordinate: `schema/src/index.ts` is also in
T-008's files — sync if both active.

## Log (append-only)

- [2026-11-24 19:29 UTC] created (Vesper, from T-007 worker audit F2–F5 — beta blocker).
