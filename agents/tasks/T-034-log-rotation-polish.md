---
id: T-034
title: Log rotation polish — load backup tail + accurate startup hint
status: backlog
owner:
priority: low
depends_on: [T-024]
files:
  - apps/mobile/src/lib/pipeline-log.ts
  - apps/mobile/src/app/_layout.tsx
  - docs/TESTING.md
updated_at: 2026-11-25T05:15Z
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
