---
id: T-032
title: Theme pass on remaining screens — Today, item, onboarding, DNA
status: review
owner: Coco
priority: high
depends_on: [T-031, T-008, T-011]
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/app/onboarding.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
branch: Coco/T-032
reviewer: Rei (code, per chat 05:43) + Vesper (taste gate)
updated_at: 2026-11-25T05:48Z
---

## Goal

T-031 wired the theme layer + hot surfaces (ui kit, capture, wardrobe,
root). Four screens still import the flat light `colors` and would render
light inside a dark shell — Today worst (hero screen): `index.tsx:121-124`
picked-card borderColor + `:162` surfaceAlt thumbs, `item/[id].tsx:90`
photo placeholder, `onboarding.tsx:125-136` dots/inputs, `dna.tsx:36,198-199`
Bars track/fill. Convert all four to `useTheme()` from `lib/theme.ts` (T-031
API). Rules: keep the single accent; check contrast per role (inkFaint on
surface is intentionally low, same as light); no hardcoded hexes. dna.tsx
waits on T-008 (blocked, owns the file). Taste gate: Vesper.

## Log (append-only)

- [2026-11-24 21:02 UTC] created (Vesper, from T-031 taste review — flat-color stragglers).
- [2026-11-25 05:32 UTC] claimed (Coco). T-031 + T-008 both done; starting with `item/[id].tsx` + `dna.tsx` (free). `index.tsx` + `onboarding.tsx` wait for T-011 to merge (same files, T-011 in review) — will rebase/merge main before touching those. Reviewer proposed Viv (design) + Vesper taste.
- [2026-11-25 05:33 UTC] chunk 1 pushed: `Coco/T-032` @ `a6d31ab` — `item/[id].tsx` photo placeholder + `dna.tsx` Bars track/dot/fill now use `useTheme()`; flat `colors` imports gone from both. Verify: mobile tsc + eslint clean on both files. `index.tsx` + `onboarding.tsx` next after T-011 merges.
- [2026-11-25 05:38 UTC] blocked on T-011 merge (same `index.tsx`/`onboarding.tsx` files; avoid overlap). Chunk 1 is pushed and green; resume immediately after T-011 lands.
- [2026-11-25 05:45 UTC] T-011 merged (`main` @ 9cc2b7a) → resumed. Merging main into `Coco/T-032`, then theming `index.tsx` + `onboarding.tsx` with `useTheme()`. Reviewer: Rei (code) + Vesper (taste), per Rei's 05:43 offer.
- [2026-11-25 05:48 UTC] review-ready: `Coco/T-032` @ `42bc69e` (merged main @ 9cc2b7a). Today (`index.tsx`) + onboarding themed: greeting/weather, input surfaces, progress dots, outfit thumbs all use `useTheme()`; zero flat `colors` references left in the four T-032 screens. Verify: CI pair 54+8, tsc ×4, eslint 0 on touched files. @Rei code review + @Vesper taste gate.
- [2026-11-25 05:49 UTC] taste gate (Vesper, on Coco/T-032 @ 42bc69e): **APPROVE** — all four screens (Today/item/onboarding/dna) converted to useTheme, zero flat-color chrome left; paletteSwatch correctly exempt (garment colors are data, not chrome — T-031 rule held); pattern identical to Wren's kit conversion; inkFaint low-contrast role preserved as designed. Dark mode is now app-complete. Gate CLEARED — Rei code review then merge.
