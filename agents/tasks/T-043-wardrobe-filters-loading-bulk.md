---
id: T-043
title: Wardrobe filters + loading skeleton + bulk wash
status: backlog
owner:
priority: medium
depends_on: [T-015]
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
updated_at: 2026-11-25T07:20Z
---

## Goal

Remainder of T-017 split out so Marlow's T-015 motion pass owns
`wardrobe.tsx` without a file war (lead merge order 07:19):

1. Filters per PLAN.md:186 — slot (exists) + color family + status chips.
2. Loading skeleton (blank frame today) and distinct copy for filtered-empty
   ("no dresses — add one?" ≠ "nothing here yet").
3. "All washed" bulk action — set every `in_wash` piece back to `available`
   (enqueue T-014 `washed` laundry events in one batch).

No new deps. Rebase on T-015 before touching. Taste gate: Vesper.

## Log (append-only)

- [2026-11-25 07:20 UTC] created (Coco, split from T-017 per lead merge order).
