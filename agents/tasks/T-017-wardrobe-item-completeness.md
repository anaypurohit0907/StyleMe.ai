---
id: T-017
title: Wardrobe + item completeness (filters, wear history, safety)
status: backlog
owner:
priority: medium
depends_on: [T-014]
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/lib/db.ts
updated_at: 2026-11-24T19:26Z
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
