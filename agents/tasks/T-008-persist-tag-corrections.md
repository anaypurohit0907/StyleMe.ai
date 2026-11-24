---
id: T-008
title: Persist tag corrections and protect them on re-scan
status: in-progress
owner: Yves
priority: high
depends_on: []
files:
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/db.ts
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/lib/tag-corrections.ts
  - packages/schema/src/index.ts
branch: Yves/T-008
updated_at: 2026-11-24T19:53Z
---

## Goal

Saving an edited tag must append `{field, from, to, at}` to `garment.corrections`
instead of silently overwriting attrs. Re-scan must apply the latest user
correction per field after model inference so a model update cannot undo a
manual fix. Expose corrections for the flywheel (export/sync shape already in
schema).

## Log (append-only)

- [2026-11-24 19:12 UTC] created (Yves, feed-the-board while testing T-002). Evidence: `saveTags()` writes draft attrs only; `dna.tsx` re-scan overwrites attrs and ignores `g.corrections`.
- [2026-11-24 19:52 UTC] claimed (Yves), post-T-002. Critical because the 19:35 re-scan may have overwritten manual tags; re-scans stay paused until this ships.
- [2026-11-24 19:53 UTC] implemented (`a90f59f`): typed correction records, pure `diffCorrections`/`applyCorrections` with enum guards, item save appends diffs, re-scan applies them after inference. Pure helper test + full turbo test/typecheck pass. Building; device verification next.
