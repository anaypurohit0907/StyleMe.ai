---
id: T-019
title: Worker tenant scoping — fix cross-user garment overwrite
status: in-progress
owner: Indigo
priority: critical
depends_on: []
files:
  - apps/worker/src/db.ts
  - apps/worker/migrations/0002_tenant_scoping.sql
  - apps/worker/tests/worker.test.ts
  - apps/worker/tests/mockdb.ts
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-019-worker-tenant-scoping.md
branch: Indigo/T-019
updated_at: 2026-11-24T19:36Z
---

## Goal

Deployed attack surface (audit §6, F1): sync upsert uses
`ON CONFLICT(id) DO UPDATE` with no user_id check (`worker/src/db.ts:64-89`)
while `garments.id` is a global PK — user B can overwrite user A's rows,
and ids are client-generated strings. Fix: (1) scope the upsert — composite
key `(user_id, id)` via a new migration (0001 is `IF NOT EXISTS`-frozen:
never edit it, add 0002), or keep the PK and add
`... DO UPDATE ... WHERE garments.user_id = excluded.user_id` plus a
user-bound insert guard; (2) add a multi-user regression test — two users,
same garment id, sync both, assert isolation (the current MockD1
pattern-matcher can't catch this: model `ON CONFLICT` semantics faithfully
or assert on the SQL + guard clause); (3) same scoping audit for every
other write path while there (they read as scoped, prove it in tests).
Migration must be applied via `wrangler d1 migrations apply` per README §
"Deploy the worker" — document the exact command in the PR.

## Log (append-only)

- [2026-11-24 19:28 UTC] created (Vesper, from T-007 worker audit F1 — beta blocker).
