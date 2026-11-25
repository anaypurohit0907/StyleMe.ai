---
id: T-039
title: Worker — import NEUTRAL_COLORS from engine instead of the local 7-name copy
status: backlog
owner:
priority: low
depends_on: []
files:
  - apps/worker/src/index.ts
branch:
updated_at: 2026-11-25T06:02Z
---

## Goal

T-021 made `NEUTRAL_COLORS` the single neutral-list export in
`packages/engine/src/color.ts` (canonical PALETTE-derived) and migrated
every copy except one: `apps/worker/src/index.ts:228` still hardcodes
the seven names (was owned by Indigo's in-progress T-020 at the time —
hence this task). Import it: `import { NEUTRAL_COLORS } from
"@styleme/engine"` (worker already depends on the engine package) and
delete the local array. One-line behavioral note for the reviewer: the
export is derived from `PALETTE[c].neutral`, which is exactly those
seven — identical values, no behavior change. Verify with the worker
test suite (`cd apps/worker && npx vitest run`) + `npx turbo run
typecheck --filter=@styleme/worker`.

## Log (append-only)

- [2026-11-25 06:02 UTC] created (Marlow — T-021 finding 5 remainder; file freed by T-020 merge @ 9a1fe2c).
