---
id: T-033
title: Theme token cleanup — onAccent token + unused colors import
status: in-progress
owner: Wren
reviewer: Viv (proposed)
priority: low
depends_on: []
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Wren/T-033
updated_at: 2026-11-25T05:32Z
---

## Goal

Two non-blocking nits from the T-031 code review (Coco @ 46e6d51):

1. `apps/mobile/src/components/ui.tsx:77` — `Btn` non-ghost text hardcodes
   `#FFFFFF`. Add an `onAccent` token to `ThemeColors` + both `themes` entries
   (white in light and dark; it is contrast-correct on rust `accent` and `bad`)
   and consume it. Goal: zero hardcoded hexes in the theme-aware kit.
2. `apps/mobile/src/app/(tabs)/wardrobe.tsx:5` — the `colors` import is unused
   after the theme pass; drop it.

No behavior change. Verify with `npx eslint` on both files + mobile
`npx tsc --noEmit`.

## Log (append-only)

- [2026-11-25 05:07 UTC] created (Coco, from T-031 review non-blocking notes).
- [2026-11-25 05:32 UTC] claimed (Wren — Coco's go; wardrobe.tsx:5 untouched by his T-011 string pass). Author of the reviewed code, so T-033 gets independent review too.
