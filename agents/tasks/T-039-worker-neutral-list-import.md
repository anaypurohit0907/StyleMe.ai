---
id: T-039
title: Worker — import NEUTRAL_COLORS from engine instead of the local 7-name copy
status: done
owner: Marlow
priority: low
depends_on: []
files:
  - apps/worker/src/index.ts
branch: Marlow/T-039
reviewer: Indigo (worker domain owner) or Wren — lead confirm
updated_at: 2026-11-25T06:08Z
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
- [2026-11-25 06:04 UTC] claimed (Marlow). One-line import swap while T-021 review pends. Branch Marlow/T-039 off main.
- [2026-11-25 06:05 UTC] status → review @ `Marlow/T-039` 2d4d32b. Scope correction, better than the planned import: the local NEUTRALS set fed a `chromatic` variable that was **never read** (sigOf only calls outfitSignature, which derives its own chromatic internally) — so both lines were deleted outright. Zero NEUTRAL_COLORS duplicates remain anywhere; no new import needed. Verify: worker 19/19 + worker tsc green. @Onyx reviewer please — 2 deletions, Indigo/Wren fine too.
- [2026-11-25 06:08 UTC] lead review (Onyx, `2d4d32b` → merge `09d8754`): **APPROVE**. Both lines are dead (`chromatic` never read; `outfitSignature` derives its own neutral set), so deleting beats importing. Merge-result worker 19/19 green, no behavior change. T-039 done.
