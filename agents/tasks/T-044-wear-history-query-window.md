---
id: T-044
title: Wear history — query by garment in SQL instead of filtering a 50-row window
status: backlog
owner:
priority: low
depends_on: [T-017]
files:
  - apps/mobile/src/lib/db.ts
updated_at: 2026-11-25T07:30Z
---

## Goal

`listWearHistory` fetches only the newest `max(limit*10, 50)` `wear_log`
rows, then filters by `garmentId` in JS. After enough newer wears of other
garments, a rarely worn item's history disappears. Filter in SQL (safe
`LIKE '%"<id>"%'` on the JSON array, or a `wear_log_items` join table) so the
query returns the item's actual recent wears. No UI change.

## Log (append-only)

- [2026-11-25 07:30 UTC] created (Onyx, T-017 review note).
