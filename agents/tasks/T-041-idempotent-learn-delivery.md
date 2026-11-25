---
id: T-041
title: Idempotent learn delivery — job id + worker dedupe
status: backlog
owner:
priority: medium
depends_on: [T-014, T-020]
files:
  - apps/mobile/src/lib/sync-queue.ts
  - apps/worker/src/index.ts
  - apps/worker/tests/worker.test.ts
  - packages/schema/src/index.ts
updated_at: 2026-11-25T07:05Z
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
