---
id: T-015
title: Motion + haptics pass — make it feel alive
status: backlog
owner:
priority: high
depends_on: [T-012, T-013, T-014]
files:
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/package.json
  - package-lock.json
updated_at: 2026-11-24T19:24Z
---

## Goal

Zero motion, zero haptics today: reanimated 4.7.1 is installed and never
imported (audit §4). Ship the feel pass: (1) `npx expo install
expo-haptics` — package.json/lockfile are shared hotspots: announce on the
chatboard before touching, one owner per wave; (2) outfit cards on Today:
staggered entrance animation, animated shuffle transition (cards swap with
layout animation, not an instant re-render); (3) press feedback: Btn/Chip
scale 0.97 + opacity on press (reanimated or Pressable style fn), replace
the instant opacity snap; (4) haptics: shutter press, outfit pick, "washed
it", re-scan completion; (5) respect OS reduce-motion. 60fps only — no
spinning splash theatrics; the motion vocabulary is short, soft, confident.

## Log (append-only)

- [2026-11-24 19:24 UTC] created (Vesper, from T-007 audit §4 — feel tier).
