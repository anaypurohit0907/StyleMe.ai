---
id: T-024
title: Structured logging — terminal/logfile instead of reading the screen
status: review
owner: Yves
priority: high
depends_on: []
reviewer: Rei
files:
  - apps/mobile/src/lib/pipeline-log.ts
  - apps/mobile/src/components/scan-log.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/segment.ts
  - apps/mobile/src/lib/onnx-tagger.ts
  - apps/mobile/src/app/_layout.tsx
  - docs/TESTING.md
updated_at: 2026-11-24T20:34Z
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
