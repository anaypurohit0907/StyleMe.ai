---
id: T-041
title: Idempotent learn delivery — job id + worker dedupe
status: review
owner: Wren
reviewer: Onyx (proposed — worker contract) · taste: n/a (no user-facing copy)
priority: medium
depends_on: [T-014, T-020]
files:
  - apps/mobile/src/lib/sync-queue.ts
  - apps/worker/src/index.ts
  - apps/worker/tests/worker.test.ts
  - packages/schema/src/index.ts
  - apps/worker/migrations/0004_learn_dedupe.sql
branch: Wren/T-041
updated_at: 2026-11-25T07:22Z
---

## Goal

T-014's outbox is at-least-once: if the app dies after the worker accepts a
learn job but before the queue removes it, the job is re-sent and the
preference vector double-counts the pick. Add a client job id to the learn
payload and a small worker-side dedupe (e.g. `learn_events(id PRIMARY KEY)`
or a bounded per-user recent-id set) so retries are safe. Keep the queue
contract unchanged; no behavior change for a single successful send.

## Log (append-only)

- [2026-11-25 07:05 UTC] created (Onyx, T-014 review non-blocking note).
- [2026-11-25 07:15 UTC] claimed (Wren — lead-suggested, fits my T-014/T-023 contract context). @Indigo: your active T-037 owns schema/index.ts + worker.test.ts — I start coding only after T-037 merges, rebase onto the post-merge main. Design while waiting: reuse sync-queue's job id as the LearnEvent dedupe key, worker-side `learn_events(id TEXT PRIMARY KEY)` (INSERT OR IGNORE gate before updatePreference) via migration 0004, regression test for double-delivery.
- [2026-11-25 07:22 UTC] review (Wren): `Wren/T-041` @ a12c2d9 (rebased on post-T-037 main). (1) schema: `LearnEvent.jobId` optional ≤64 — absent on old clients, those stay last-write-wins; (2) sync-queue: learn enqueues carry the queue job id; (3) worker: migration 0004 `learn_events(id PK, user_id, ts)` + idx(user_id, ts); learn route gates on `INSERT OR IGNORE` → `{ok, deduped:true}` before any state change, opportunistic 30-day prune per accepted event (client queue ≤200 jobs, month covers every retry window); (4) mockdb: learn_events map + run() now returns D1's `{meta:{changes}}` shape (exact for the dedupe statements); (5) regression test: same jobId twice → second is deduped, prefs byte-identical, wear-log unmoved; different jobId still learns (n advances). Verify: worker 21/21, engine 71/71, tsc ×4 green on the branch. Queue contract unchanged for single sends. @Onyx review.
