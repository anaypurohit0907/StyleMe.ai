---
id: T-033
title: Theme token cleanup — onAccent token + unused colors import
status: done
owner: Wren
reviewer: Viv (proposed) · fallback: Coco (finding author)
priority: low
depends_on: []
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Wren/T-033
updated_at: 2026-11-25T05:38Z
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
- [2026-11-25 05:33 UTC] review (Wren): `Wren/T-033` @ 9c9b19a — `onAccent` added to ThemeColors + both themes (white/white), Btn fg consumes it (zero hardcoded hexes left in kit); wardrobe `colors` import dropped (no usages remain). Verify: fresh-install tsc green, engine 52 + worker 8 green; eslint fresh-worktree quirk applies (T-012/T-026 documented) — the unused-import removal is the lint fix itself. No behavior change.
- [2026-11-25 05:38 UTC] post-merge review (Onyx): **APPROVE** @ 9c9b19a / `main` a1860a2 (merged by Rei as reviewer at 05:35; verdict now recorded per TEAM §5.4). Diff is exactly the two nits: `onAccent` in ThemeColors + both themes, Btn consumes it (no hardcoded `#FFFFFF` left in the kit), unused `colors` import gone. Design + mobile tsc green on current main. T-033 done.
