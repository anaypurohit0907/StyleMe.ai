---
id: T-037
title: Cap remaining client payload strings — learn/laundry arrays, corrections, photo refs
status: review
owner: Indigo
reviewer: Onyx
priority: medium
depends_on: [T-020]
files:
  - packages/schema/src/index.ts
  - apps/worker/tests/worker.test.ts
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-037-cap-remaining-payload-strings.md
branch: Indigo/T-037
updated_at: 2026-11-25T07:04Z
---

## Goal

T-020 capped the sync path (500 upserts, garment id, embedding, onboarding,
tempC) but several client-controlled strings/arrays are still unbounded:
`LearnEventSchema.suggestedIds` (no outer max), `pickedId` (no max),
`LaundryEventSchema.garmentIds` (no max), `CorrectionSchema.from/to` (no max),
`GarmentSchema.photoRef/originalRef` (no max). A valid-JWT client can send
huge payloads into D1 rows/CPU. Add sane caps + 400 tests, keeping current
mobile shapes valid. No behavior change for honest clients.

## Log (append-only)

- [2026-11-25 05:54 UTC] created (Onyx, from T-020 final review — non-blocking
  follow-up; T-020 shipped the auth-critical caps).
- [2026-11-25 07:04 UTC] claimed (Indigo, lead-directed 06:02). Reviewer proposed Onyx (T-020 pattern; lead confirm). Branch Indigo/T-037 off current main; T-041 also lists these files but is backlog/unowned — first-claim wins, coordinate at its claim.
- [2026-11-25 07:12 UTC] → review @ `Indigo/T-037` **620e36c**: all unbounded strings/arrays capped — `LearnEvent.suggestedIds` ≤20 outfits × ≤6 ids ≤64 chars, `pickedId` ≤512, `LaundryEvent.garmentIds` ≤100 × ≤64, `Correction.from/to` ≤64 (matches nickname bound), `Garment.photoRef/originalRef` ≤512, `WardrobeSync.deletions` items ≤64. Five 400-regression tests added (oversized offers, pickedId, laundry batch, correction strings, photoRef). Honest-client shapes unchanged. Verification: worker 20/20, engine 71/71, tsc ×4 on the branch. No worker route changes needed — schemas are the validation layer per apps/worker/AGENTS.md.
