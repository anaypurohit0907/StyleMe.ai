---
id: T-020
title: Worker auth hardening, validation, rate limits
status: in-progress
owner: Indigo
reviewer: Onyx
priority: critical
depends_on: [T-019]
files:
  - apps/worker/src/index.ts
  - apps/worker/src/auth.ts
  - apps/worker/src/db.ts
  - apps/worker/src/weather.ts
  - apps/worker/migrations/0003_auth_device_secret.sql
  - apps/worker/tests/worker.test.ts
  - apps/worker/tests/mockdb.ts
  - packages/schema/src/index.ts
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-020-worker-auth-validation-limits.md
branch: Indigo/T-020
updated_at: 2026-11-24T20:03Z
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
- [2026-11-24 19:57 UTC] claimed (Indigo). Reviewer: Onyx (lead-assigned). Schema file use pinged to Yves (T-008 overlap) — worker-side files proceed meanwhile.
- [2026-11-24 20:03 UTC] worker-side complete, 14/14 worker tests + tsc green: (1) proof-of-possession — migration 0003 (`users.reg_secret_hash`), `/v1/auth/device` returns one-time 64-hex secret at first registration, stores only SHA-256 hash; re-registration demands the secret (403 otherwise); legacy NULL-hash users get a one-time upgrade (new secret minted at first re-contact, then enforcement on); onboarding now stored at registration only (F2 takeover + onboarding-overwrite fixed); (2) rate limits — fixed-window isolate-local buckets: auth 10/min per-IP AND per-deviceId, sync 30/min, recommend 10/min, learn 30/min per-user, 429s, opportunistic prune at 10k buckets (F3); (3) `app.onError` added, passes Hono HTTPExceptions through, 500s stop leaking stacks; recommend context now `safeParse` → 400 on bad occasion (was ZodError 500) (F4); (4) learn rejected-filter fixed to join("+")-id comparison (was object identity — picked outfit got pick + rejection nudges, learning at ~65%); regression test verified to fail against the old code; (5) weather cache capped at 1000 entries, insertion-order eviction (F5). MockD1 extended (reg_secret_hash column, UPDATE branch). Remaining: schema payload caps + ScoredOutfitSchema min(2) — blocked on Yves OK for `packages/schema/src/index.ts` (his active T-008 file). Mobile must store+resend registrationSecret — feeding as follow-up task.
- [2026-11-24 20:17 UTC] independent pre-review (Rei, T-029 helper; worker-side diff only, not the approve): logic sound — PoP hash-only storage, constant-time-ish compare, onboarding registration-only, learn join("+") filter correct, onError/400s correct, cache cap safe. Three rollout notes, none blocking worker-side code: (a) **deploy order**: current mobile never sends `registrationSecret` and calls `/v1/auth/device` only when its token cache is empty (`apps/mobile/src/lib/api.ts:26-42`) — deploying the worker before mobile T-028 means any install that loses its cached token gets a hard 403 lockout; ship T-028 first/same window, and note it in Q-004. (b) **legacy upgrade is a first-caller-wins window**: any caller knowing a pre-0003 deviceId gets the fresh secret + 1-year token and sets the hash; the real device then 403s. Acceptable for a 7-user beta but needs a cutover deadline + runbook line (consider accepting a valid old JWT as the upgrade proof). (c) **first-registration race**: two concurrent calls both see no row; `ensureUser` does a plain INSERT (no OR IGNORE) so one 500s, and for legacy rows two `setUserRegSecretHash` calls last-write-wins (first client's secret dies). Low probability; fix with `INSERT ... ON CONFLICT DO NOTHING` + re-read, or make the hash set conditional on `reg_secret_hash IS NULL`.
