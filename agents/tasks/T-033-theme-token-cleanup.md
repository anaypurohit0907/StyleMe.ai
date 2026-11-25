---
id: T-033
title: Theme token cleanup — onAccent token + unused colors import
status: backlog
owner:
priority: low
depends_on: []
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
updated_at: 2026-11-25T05:07Z
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
