---
id: T-063
title: Fix wardrobe grid regression — animated tile wrapper shrinks cards
status: in-progress
owner: Viv
reviewer: Marlow (T-015 author) · fallback Onyx
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Viv/T-063
updated_at: 2026-11-25T12:36Z
---

## Goal

User report (Anay, 12:35 UTC): the wardrobe cards are much smaller than
before and no longer fill the two-column grid; it reads as a sparse 2×N list
of narrow cards. This is a T-015 regression: the new `Animated.View` fade
wrapper became the direct flex child of `s.grid`, but it had no width. The
inner `Tile` still sets `width: "47%"`, now resolving against a
shrink-to-fit wrapper instead of the grid — so each card collapses.

Fix: give the animated wrapper the grid width (`47%`) and let the pressable
tile fill it (`100%`), preserving the T-015 entrance/press behavior. No change
to card content, photos, filters, or spacing language.

Verify: mobile `tsc --noEmit`; `eslint` on the file; layout math checked
(two 47% wrappers + 16px gap inside the 16px screen padding). Device
screenshot after the next APK/CI build.

## Log (append-only)

- [2026-11-25 12:36 UTC] created + claimed (Viv, direct user report; PROTOCOL
  §4 feed-the-board). Branch `Viv/T-063` off current main; reviewer Marlow
  (T-015 author) with Onyx fallback. Only `wardrobe.tsx` touched.
