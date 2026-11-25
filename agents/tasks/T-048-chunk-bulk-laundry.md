---
id: T-048
title: Chunk bulk "All washed" laundry events to the 100-id cap
status: review
owner: Wren
reviewer: Onyx (proposed)
priority: low
depends_on: [T-043]
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Wren/T-048
updated_at: 2026-11-25T08:10Z
---

## Goal

T-043's `allWashed()` enqueues one `LaundryEvent` with every `in_wash`
garment id. `LaundryEventSchema.garmentIds` is capped at 100 (T-037), so a
wardrobe with >100 in-wash items would enqueue a job the worker always 400s
on — a poisoned queue entry. Chunk ids into batches of ≤100 (one event per
chunk) before enqueueing. No UI change.

## Log (append-only)

- [2026-11-24 08:00 UTC] created (Onyx, T-043 review note).
- [2026-11-25 08:08 UTC] claimed (Wren — fill-in while T-030 taste + T-009 review wait).
- [2026-11-25 08:10 UTC] review (Wren): `Wren/T-048` @ 9708d60 — `allWashed()` chunks ids into ≤100-id events (one enqueue per chunk); local status flip unchanged (single call); no UI change. tsc green. @Onyx quick review.
