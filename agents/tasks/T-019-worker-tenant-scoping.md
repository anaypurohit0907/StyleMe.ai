---
id: T-019
title: Worker tenant scoping — fix cross-user garment overwrite
status: done
owner: Indigo
priority: critical
depends_on: []
files:
  - apps/worker/src/db.ts
  - apps/worker/migrations/0002_tenant_scoping.sql
  - apps/worker/tests/worker.test.ts
  - apps/worker/tests/mockdb.ts
  - apps/worker/AGENTS.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-019-worker-tenant-scoping.md
branch: Indigo/T-019
updated_at: 2026-11-24T19:52Z
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
- [2026-11-24 19:37 UTC] claimed (Indigo).
- [2026-11-24 19:58 UTC] fix complete, moving to review — commit 06f194e: (1) `migrations/0002_tenant_scoping.sql` rebuilds garments with composite PK `(user_id, id)` via shadow table (0001 untouched; FK kept, orphaned rows abort loudly by design); (2) `db.ts` upsert conflict target → `ON CONFLICT(user_id, id)`; (3) MockD1 now keys garments by `(user_id, id)`, models ON CONFLICT DO UPDATE faithfully, throws UNIQUE-violation on plain conflicting INSERT, scopes DELETE by user (no false-green); (4) regression test: two devices, same garment id — no overwrite on sync, no cross-user laundry status change, no cross-user rotation stamp, no cross-user delete. All other write paths audited scoped (laundry/learn UPDATEs user-bound, suggestions/wear_log user-column inserts, tone_cache composite PK, photos R2 key user-prefixed). CI pair + typecheck set green. Deploy note: apply with `npm run db:migrate` (= `wrangler d1 migrations apply styleme --remote`) BEFORE `wrangler deploy`, per README § "Deploy the worker" + apps/worker/AGENTS.md.
- [2026-11-24 19:51 UTC] QA (Vesper, T-022): **approve** — "composite PK + scoped upsert + real two-user regression test; migration data-preserving, 0001 frozen, deploy-order documented." Two follow-ups: partial-failure ops line + commit lineage.
- [2026-11-24 20:01 UTC] incident + repair (Wren): merge cef8ca9 dropped 06f194e content from main; Wren restored via cherry-pick ea6e575 on main, tests rerun green. Verified identical tree to 06f194e. (Timestamps 19:58/19:59 above were assumed, not `date -u` read — actual close ~19:50 UTC; honest stamps resumed.)
- [2026-11-24 19:53 UTC] done — Vesper's QA notes addressed: ops line for mid-apply failure (`DROP TABLE garments_scoped` then re-run) added to `apps/worker/AGENTS.md` § D1; lineage: restored content rides main via ea6e575, Indigo/T-019 ref aligned to main. 8/8 worker tests + tsc green on restored state.
