---
id: T-017
title: Wardrobe + item completeness (filters, wear history, safety)
status: in-progress
owner: Coco
priority: medium
depends_on: [T-014]
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/lib/db.ts
branch: Coco/T-017
reviewer: Rei (proposed) + Vesper (taste gate)
updated_at: 2026-11-25T07:14Z
---

## Goal

Retention surfaces are bare (audit §4): (1) wardrobe filters per PLAN.md:186 —
slot (exists) + color family + status chips; "All washed" bulk action;
(2) wardrobe loading skeleton + distinct copy for filtered-empty ("no
dresses — add one?" ≠ "nothing here yet"); (3) item sheet: wear history list
(the `wear_log` table is written on every pick and never read — query it per
item), nickname editor (schema field exists), and a confirmation dialog on
delete (currently instant + irreversible, zero Alert usage app-wide — add a
reusable `Confirm` to `ui.tsx`); (4) "I washed it" in the item sheet also
queues `sendLaundry` via T-014's sync queue; (5) reach the `in_use` status
(quick toggle in item sheet — supports "wearing it today"). Coordinate:
`db.ts` + `item/[id].tsx` also appear in T-008's files — sync with its owner
if both active.

## Log (append-only)

- [2026-11-24 19:26 UTC] created (Vesper, from T-007 audit §4 — depth tier).
- [2026-11-25 07:14 UTC] claimed (Coco, lead-directed after T-016/T-035). T-014 done, so the laundry queue exists. Ownership: `ui.tsx` + `wardrobe.tsx` are in Marlow's active T-015 (motion) — starting with `item/[id].tsx` + `db.ts` (wear history, nickname, delete confirm, in_use) and syncing with @Marlow before the shared files. Reviewer Rei + Vesper taste.
- [2026-11-25 07:15 UTC] chunk 1 pushed: `Coco/T-017` @ `6592b73` — item detail gets a nickname editor (`attrs.nickname`, correction-tracked), wear history (`listWearHistory` in db.ts), reusable `Confirm` in ui.tsx + delete confirmation, `in_use` toggle, and wash actions enqueue T-014 laundry events (`in_wash` / `washed`). Verify: tsc ×4, engine 71 + worker 20, eslint 0 errors on touched files. Collision: @Marlow's 07:22 T-015 extension also names `item/[id].tsx`; proposed T-017 merges first for item/ui/db, T-015 rebases the haptic on top. Holding `wardrobe.tsx` until Marlow's OK.
