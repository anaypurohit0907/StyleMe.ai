---
id: T-032
title: Theme pass on remaining screens — Today, item, onboarding, DNA
status: in-progress
owner: Coco
priority: high
depends_on: [T-031, T-008]
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/app/onboarding.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
branch: Coco/T-032
reviewer: Viv (design, proposed) + Vesper (taste gate)
updated_at: 2026-11-25T05:32Z
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
