---
id: T-030
title: Personalize capture session target from onboarding wardrobe-size guess
status: in-progress
owner: Wren
reviewer: Vesper (proposed — copy) · code: Rei
priority: low
depends_on: [T-013]
files:
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/app/onboarding.tsx
branch: Wren/T-030
updated_at: 2026-11-25T07:50Z
---

## Goal

Vesper taste-gate note on T-013 (c906918): `SESSION_TARGET = 30` is hardcoded
(capture.tsx), but onboarding already asks a wardrobe-size guess
(onboarding.tsx). Read the stored guess via local meta and use it as the
session progress target so the bar reflects the user's actual setup ambition.
Cap the displayed target to a sane band (e.g. 10–60) and fall back to 30 when
unset. Touches capture.tsx only for the math; onboarding/local.ts only if the
guess isn't already persisted as meta. Coordinate: onboarding.tsx + local.ts
appear in T-011/T-008 file lists — sync with owners at claim time.

## Log (append-only)

- [2026-11-24 20:17 UTC] created (Wren, feed-the-board from T-013 taste-gate note 1).
- [2026-11-25 07:50 UTC] claimed (Wren). Premise correction: onboarding never shipped a size guess (PLAN.md §5 spec'd it; the field doesn't exist) — so this task ADDS it: chip row on the laundry step, meta `wardrobeSizeGuess`, capture clamps 10–60 default 30.
