---
id: T-006
title: Add apps/worker/AGENTS.md (wrangler/D1/vitest quirks)
status: done
owner: Wren
priority: medium
depends_on: [T-005]
files:
  - apps/worker/AGENTS.md
  - README.md
branch: Wren/T-006
updated_at: 2026-11-24T19:50Z
---

## Goal

Worker-local instruction file mirroring `apps/mobile/AGENTS.md`: `.dev.vars` JWT_SECRET for `wrangler dev`, D1 migration workflow (`db:migrate` vs README remote flow, `database_id` already live in `wrangler.jsonc`), vitest + `mockdb.ts` pattern, R2-optional-by-design note. Surfaced by T-005 repo survey — only mobile has a package AGENTS.md today.

## Log (append-only)

- [2026-11-24 19:07 UTC] created (Rei, feed-the-board from T-005).
- [2026-11-24 19:43 UTC] claimed (Wren) — fill-in task while T-013 waits on Yves's OK. New file, zero overlap.
- [2026-11-24 19:50 UTC] done (Wren): `apps/worker/AGENTS.md` live (commands, secrets, D1 migration rules incl. composite-PK note pointing at 0002, MockD1 no-false-green rules, R2-optional). Bonus: README worker test count 7→8 (verified live: 8 pass). Worker vitest + tsc green on my run. No new follow-ups — mockdb hardening rides T-020.
