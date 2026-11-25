---
id: T-024
title: Structured logging — terminal/logfile instead of reading the screen
status: done
owner: Yves
priority: high
depends_on: []
reviewer: Rei (assigned) · code review: Coco (Rei absent, Q-005)
files:
  - apps/mobile/src/lib/pipeline-log.ts
  - apps/mobile/src/components/scan-log.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/segment.ts
  - apps/mobile/src/lib/onnx-tagger.ts
  - apps/mobile/src/app/_layout.tsx
  - docs/TESTING.md
updated_at: 2026-11-25T05:15Z
---

## Goal

User order (chatboard 2026-11-24 19:5x): "we need better logging, instead of
slowly reading the screen, add logs to the code and read in the terminal or
logfile." Today the vision pipeline's only observable surface is the ScanLog
card rendered on the capture screen (see docs/TESTING.md scan-log legend) —
debugging means squinting at a phone. Build a leveled structured logger
(`apps/mobile/src/lib/log.ts`): tagged + timestamped lines
(`[vision] [db] [engine] …`), console sink in dev (Metro terminal), rotating
file sink on-device for release builds (exportable/shareable), no new runtime
deps — follow Expo SDK 58 idioms. Wire it into the scan/tag pipeline
(ScanLog emissions become log lines too — keep the UI card, add the log
stream behind it), capture flow, sync/learn calls. Update docs/TESTING.md:
how to tail logs from a laptop (`adb logcat` / Metro) and how to pull the
logfile. Worker already logs via stdout per request — leave unless trivial
to align tags. Success: tester reproduces a scan issue and reads the trace
in a terminal without touching the phone UI.

## Log (append-only)

- [2026-11-24 19:51 UTC] created (Indigo, fed from user chatboard order — PROTOCOL §4 feed-the-board).
- [2026-11-24 20:32 UTC] claimed (Yves). Rescope: shipped `pipeline-log.ts` already has levels-lite/ring/file sink, but the sink is internal `documentDirectory` (not pullable). Real fix = app-specific external `styleme.log`, rotation, `[vision]/[scan]/[capture]` tags, error levels, docs for `adb pull`/`tail -f`; keep UI card. Reviewer Rei (lead to confirm).
- [2026-11-24 20:34 UTC] review (`23795d5`): external Android log sink (`/sdcard/Android/data/<pkg>/files/styleme.log`), documentDirectory fallback on iOS/Expo Go, 2MB rotation + `.1`, ISO UTC timestamps, `[stage]` tags, WARN/ERROR at failure points, startup path/version line, `adb pull`/`tail -f` docs. Kept in-app card. Verification: mobile tsc, turbo tests (engine 44/worker 8), turbo typecheck ×4, `expo export` pass. Device pull test needs a merged build. Reviewer Rei (lead confirm); no main push.
- [2026-11-25 05:10 UTC] re-synced to current main (`8873ed4`), resolved capture.tsx conflict with T-013 (kept `logError` + inline saveError), engine 44 + worker 8 + 4-way typecheck + expo export green. Review-ready; @Wren/@Coco independent reviewer needed (Onyx absent).
- [2026-11-25 05:15 UTC] code review (Coco, independent — Rei absent per Q-005): **APPROVE** @ `da60c82`. Verified: external app-specific `styleme.log` sink + documentDirectory fallback, 2 MB rotation to `.1`, ISO UTC + `[stage]` tags, WARN/ERROR at failure points, startup version/OS/path line, `adb pull`/`tail -f` docs; in-app card kept. Merged `main` @ `72093cc`; resolved import-line conflicts with T-031 in `capture.tsx`/`_layout.tsx` (kept `logError`/`logWarn` + `useTheme`). Verify on merge result: CI pair green (engine 46/46 incl. 1k-user property, worker 8/8), tsc ×4 green, eslint 0 errors on touched files (8 pre-existing require warnings). Note: one CI run failed on `/tmp` user-quota exhaustion (2.9G tmpfs), not code — green after freeing review worktrees. Non-blocking: after rotation `initPipelineLog` returns before loading the prior tail (docs say it loads it); `logFileHint()` can claim the external path before `target()` resolves; `LogLevel` "debug" unused — fed T-034. Device `adb pull` verification pending: phone now attached, CI APK builds from this merge.
