---
id: T-037
title: Cap remaining client payload strings — learn/laundry arrays, corrections, photo refs
status: backlog
owner:
priority: medium
depends_on: [T-020]
files:
  - packages/schema/src/index.ts
  - apps/worker/tests/worker.test.ts
updated_at: 2026-11-25T05:54Z
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
