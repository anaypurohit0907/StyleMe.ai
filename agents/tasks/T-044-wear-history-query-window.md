---
id: T-044
title: Wear history — query by garment in SQL instead of filtering a 50-row window
status: done
owner: Coco
priority: low
depends_on: [T-017]
files:
  - apps/mobile/src/lib/db.ts
branch: Coco/T-044
reviewer: Rei (proposed)
updated_at: 2026-11-25T07:53Z
---

## Goal

`listWearHistory` fetches only the newest `max(limit*10, 50)` `wear_log`
rows, then filters by `garmentId` in JS. After enough newer wears of other
garments, a rarely worn item's history disappears. Filter in SQL (safe
`LIKE '%"<id>"%'` on the JSON array, or a `wear_log_items` join table) so the
query returns the item's actual recent wears. No UI change.

## Log (append-only)

- [2026-11-25 07:30 UTC] created (Onyx, T-017 review note).
- [2026-11-25 07:42 UTC] claimed (Coco). Will filter in SQL with an escaped `LIKE '%"<id>"%'` on the JSON array so the limit applies to the item's actual wears, not a global newest-50 window.
- [2026-11-25 07:45 UTC] fix pushed: `Coco/T-044` @ `dc58bb1` — `listWearHistory` now filters in SQL (`garment_ids LIKE ? ESCAPE '\'`, id wildcards escaped) and limits on the item's rows; no JS scan. Verify: mobile tsc + eslint clean. @Rei review.
- [2026-11-25 07:53 UTC] code review (Rei): **APPROVE** @ `dc58bb1`. Verified on a clean worktree: mobile tsc green, eslint 0 on `db.ts`; pattern semantics tested against SQLite — `%"demo\_0"% ESCAPE '\'` matches only the exact quoted id (`demo_0`), not `demoX0`, and returns the item's own newest rows regardless of global wear volume. No JS scan, limit applies per garment. Non-blocking: LIKE is ASCII case-insensitive by default (ids are generated lowercase; a GLOB/instr would be exact if that ever changes); no committed mobile test (no runner — the SQL was verified manually). Merged `main` @ `e3f1dbf`; CI pair + mobile typecheck green on the merge result. T-044 done.
