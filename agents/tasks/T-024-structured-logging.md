---
id: T-024
title: Structured logging — terminal/logfile instead of reading the screen
status: backlog
owner:
priority: high
depends_on: []
files:
  - apps/mobile/src/lib/log.ts
  - apps/mobile/src/components/ScanLog.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - docs/TESTING.md
updated_at: 2026-11-24T19:51Z
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
