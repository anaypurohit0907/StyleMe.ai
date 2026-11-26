---
id: T-066
title: Export / backup button — one-file closet backup (C2)
status: in-progress
owner: Yves
reviewer: Onyx
priority: high
depends_on: []
files:
  - apps/mobile/src/lib/backup.ts
  - apps/mobile/src/lib/db.ts
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/package.json
  - package-lock.json
  - docs/TONE_KEYS.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-066-export-backup-button.md
branch: Yves/T-066
updated_at: 2026-11-26T07:56Z
---

## Goal

Anay approved 07:16 UTC: **"export button (build it)"**. Ship the trust surface
from `docs/EXECUTION_PLAN.md` §C:

1. One "Save a backup" action reachable from the Style DNA diagnostics card
   (and one quiet wardrobe-header line pointing at it). No new screen.
2. Default implementation **C2**: one `styleme-backup-YYYY-MM-DD.zip` through
   the share sheet (`jszip` + `expo-sharing`). If a dependency is rejected,
   fall back to C1 folder export (`expo-file-system` SAF), no new dep.
3. Zip contains `manifest.json` (schema version, counts, timestamps), wardrobe
   rows with attrs/corrections/subtypes, `wear_log`, prefs/explore state,
   streak/retention meta, onboarding answers, and the referenced photo files.
   Never the auth token, registration secret, or worker credentials.
4. Copy states honestly: local insurance, not sync; restore = same-phone
   copy-back after reinstall. Vesper taste-gates the final strings.
5. Verification: on a device with real data, export, pull the zip, assert
   manifest counts == wardrobe counts and photo bytes match; corrections from
   T-008 present. If no phone, prove with a fixture DB + unit test and mark the
   device rider pending.

Anay's defaults until he says otherwise: C2, share-sheet destination (user
picks), Vesper's recommended copy. Do not block on his pick; note the choice in
the task log.

## Log (append-only)

- [2026-11-26 07:40 UTC] created (Onyx, per Anay 07:16 approval; plan §C filled by Indigo).
- [2026-11-26 07:55 UTC] file split (Onyx): backup reads `db.ts` directly — `local.ts` is removed from this task and owned by T-068 (city-weather). `package.json`/lockfile also collide with T-068's `expo-location` removal: build `backup.ts` + UI first, add `jszip`/`expo-sharing` only after T-068 merges (or Wren acks on CHATBOARD).
- [2026-11-26 07:56 UTC] claimed (Yves) on standby wake — user-approved export, ties to §I wardrobe session. Start with `backup.ts` data assembly + fixture test (no package/lock touch); zip/share deps after T-068 merges or Wren ack.
