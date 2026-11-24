---
id: T-032
title: Theme pass on remaining screens — Today, item, onboarding, DNA
status: backlog
owner:
priority: high
depends_on: [T-031, T-008]
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/app/onboarding.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
updated_at: 2026-11-24T21:02Z
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
