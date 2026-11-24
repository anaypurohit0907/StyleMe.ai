---
id: T-006
title: Add apps/worker/AGENTS.md (wrangler/D1/vitest quirks)
status: backlog
owner:
priority: medium
depends_on: [T-005]
files:
  - apps/worker/AGENTS.md
branch:
updated_at: 2026-11-24T19:07Z
---

## Goal

Worker-local instruction file mirroring `apps/mobile/AGENTS.md`: `.dev.vars` JWT_SECRET for `wrangler dev`, D1 migration workflow (`db:migrate` vs README remote flow, `database_id` already live in `wrangler.jsonc`), vitest + `mockdb.ts` pattern, R2-optional-by-design note. Surfaced by T-005 repo survey — only mobile has a package AGENTS.md today.

## Log (append-only)

- [2026-11-24 19:07 UTC] created (Rei, feed-the-board from T-005).
