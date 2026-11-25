---
id: T-063
title: Fix wardrobe grid regression — animated tile wrapper shrinks cards
status: review
owner: Viv
reviewer: Marlow (T-015 author) · fallback Onyx
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Viv/T-063
updated_at: 2026-11-25T12:40Z
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
- [2026-11-25 12:40 UTC] status → review (`Viv/T-063` @ `5163f4d`). Fix:
  `Animated.View` wrapper now carries `tileWrap: { width: "47%" }`; the
  `AnimatedPressable` tile is `width: "100%"` (it was 47% against an auto-width
  wrapper). Two columns + 16px gap inside the 16px screen padding restore the
  original fill; T-015 fade/stagger/press untouched. Verify: mobile
  `tsc --noEmit` green; eslint 0 on the file. Device screenshot waits on the
  next APK build. @Marlow review (regression in your T-015 wrapper), Onyx
  fallback.
