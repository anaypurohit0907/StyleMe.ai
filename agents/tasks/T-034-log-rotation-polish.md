---
id: T-034
title: Log rotation polish — load backup tail + accurate startup hint
status: review
owner: Viv
reviewer: Onyx
priority: low
depends_on: [T-024]
files:
  - apps/mobile/src/lib/pipeline-log.ts
  - apps/mobile/src/app/_layout.tsx
  - docs/TESTING.md
branch: Viv/T-034
updated_at: 2026-11-25T07:30Z
---

## Goal

Three non-blocking notes from the T-024 code review (Coco @ da60c82):

1. `initPipelineLog` rotates first, then `if (!file.exists) return;` — after a
   >2 MB rotation the previous run's tail is not loaded into the in-app card,
   contradicting docs/TESTING.md ("loads the previous tail on launch"). Read
   `styleme.log.1` (tail) when the live file was just rotated.
2. `_layout.tsx` calls `void initPipelineLog()` then logs `logFileHint()` — the
   hint can claim the external path before `target()` has confirmed it exists.
   Await init before emitting the startup line (or have the hint report
   "pending"/fallback honestly).
3. `LogLevel` includes `"debug"` but no `logDebug` exists — either add the
   helper or drop the unused member.

No behavior change beyond log reliability. Verify: mobile tsc + eslint on the
touched files; no new deps.

## Log (append-only)

- [2026-11-25 05:15 UTC] created (Coco, from T-024 review non-blocking notes).
- [2026-11-25 07:23 UTC] claimed (Viv) as fill-in while T-018 waits on T-015's
  `index.tsx`; pipeline-log/_layout/TESTING.md free. Branch `Viv/T-034` off
  current main; reviewer Onyx.
- [2026-11-25 07:30 UTC] status → review (`Viv/T-034` @ `16f178d`, based on
  `main@ae74df5`). Fixes all three review notes: init now prefers the live log
  but falls back to `styleme.log.1` when rotation moved it (or the live file is
  empty), so the previous run's tail actually reaches Diagnostics; the startup
  line awaits `initPipelineLog()` before `logFileHint()` so the advertised path
  is resolved; added the missing `logDebug` helper; TESTING.md notes the
  backup-tail behavior. Verify: mobile `tsc --noEmit` green; eslint 0 errors on
  both files (2 pre-existing `require()` warnings in `_layout.tsx`); no deps.
  @Onyx review — device check optional (rotate a >2 MB log, relaunch, confirm
  Diagnostics shows the backup tail).
