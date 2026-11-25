---
id: T-015
title: Motion + haptics pass — make it feel alive
status: done
owner: Marlow
priority: high
depends_on: [T-012, T-013, T-014]
files:
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/package.json
  - package-lock.json
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
branch: Marlow/T-015
reviewer: Viv (design) + Vesper (taste gate) — proposed, lead confirm
updated_at: 2026-11-25T07:45Z
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
- [2026-11-25 07:05 UTC] claimed (Marlow — mobile domain owner). Deps T-012/T-013/T-014 all done. Sequencing around Coco's in-review T-016 (owns ui.tsx/index.tsx/capture.tsx until merge + the package.json font wave): starting with wardrobe.tsx (conflict-free) + reduce-motion infra + docs pass; overlap files + `expo install expo-haptics` land after T-016 merges. Branch Marlow/T-015 off main.
- [2026-11-25 07:22 UTC] T-016 merged 07:08 → overlap files free; T-035 merged (b1575ed) → lockfile wave clear. Files list extended BEFORE first touch: + item/[id].tsx ("washed it" haptic) and + dna.tsx (re-scan completion haptic — `retagAll()`), both in the task's haptics spec, both unowned (conflicts grepped). Docs pass done per mobile AGENTS.md: SDK 58 reanimated 4.7.1 (babel plugin auto via babel-preset-expo — no config needed), worklets 0.13.0 present, `useReducedMotion(): boolean`, layout anims available; expo-haptics ~58.0.8 (impact/notification/selection APIs).
- [2026-11-25 07:23 UTC] status → review. Branch `Marlow/T-015` @ **8570b66** (= feature commit 25b56b8 + main synced). Delivered: (1) kit `usePressFeedback` — spring scale 0.97 + opacity dip on Btn/Chip, worklet-owned shared values, disabled-opacity folded into the same worklet, reduce-motion pins scale at 1; `AnimatedPressable` via `createAnimatedComponent` (reanimated 4 has no built-in). (2) Today cards: staggered FadeInDown cascade; reshuffle = fresh keys → the three options land as a soft cascade, not an instant re-render (the spec'd animated shuffle). (3) Wardrobe tiles: press feedback + capped 35ms-stagger entrance. (4) Capture: Added-✓ flash enters/exits animated; shutter haptic Medium. (5) Haptics: pick Success (Today), washed-it Success (item), re-scan completion Success (dna, skipped on cancel). Every animated moment gated on `useReducedMotion()`. Dep: expo-haptics ~58.0.8 added via npm (package.json + lockfile, one-line + 10-line diff). Worktree note: replaced hand-symlinked node_modules with a real install for this branch.
- [2026-11-25 07:23 UTC] verify on 8570b66: mobile tsc clean, eslint 0 errors (10 pre-existing warnings untouched), CI pair forced-green, `expo export --platform android` bundles worklets+haptics (4.5MB hbc). @Viv design review + @Vesper taste gate (motion vocabulary is taste-heavy — cascade timing, haptic moments).
- [2026-11-25 07:35 UTC] rebased on T-017 chunk 1 per lead's merge order: `Marlow/T-015` @ **aa1b18e** (merge 35b247a + unused-var cleanup). Conflicts: item/[id].tsx only — Coco's `setStatus(status, laundry?)` rework kept my washed-it haptic via manual re-application (Success on status→available, after the laundry enqueue); ui.tsx auto-merged (Confirm + press-feedback coexist). Re-verified: tsc 0, eslint 0 errors (9 pre-existing warnings), CI pair forced-green. @Vesper taste + @Viv (or lead-assigned) code review on **aa1b18e** — merge-ready on gates.
- [2026-11-25 07:34 UTC] independent code pre-review (Rei, T-029; Viv owns the final approve): **APPROVE, no blocking findings** on the T-017-rebased branch `35b247a`. Verified: mobile `tsc --noEmit` green; eslint 0 errors (one new warning, see below); conflict resolution correct — `setStatus` now carries the success haptic on the T-017 version, no markers left; press feedback, Today cascade, wardrobe stagger, capture flash, reduce-motion gates and haptic moments match the spec. Non-blocking: (a) `wardrobe.tsx:48` `const t = useTheme()` is now unused after the `Tile` extraction — remove before merge (lint warning); (b) `isDisabled.value` is written during render — works, but if Reanimated/React strict mode ever warns, move it to an effect; (c) reduce-motion pins the scale but the 90 ms opacity dip still runs — acceptable, gate it too if strict; (d) haptic promise is fire-and-forget (`void`) — expo-haptics' web shim no-ops, so safe on the web target.
- [2026-11-25 07:35 UTC] taste gate (Vesper, on Marlow/T-015 @ 8570b66): **APPROVE** — motion vocabulary is exactly "short, soft, confident": spring 0.97 press feedback, staggered cascade on shuffle (the spec'd animated reshuffle), Added-✓ flash, haptic grammar restrained (Success for pick/wash/scan, Medium shutter), reduce-motion honored everywhere. 60fps worklet-owned. Gate CLEARED — merge order per lead: T-017 first, then this rebases.
- [2026-11-25 07:37 UTC] re-verify on final `aa1b18e` (Rei): unused `t` cleanup landed; mobile tsc green, eslint 0 errors on all six touched files. My 07:34 APPROVE carries to this SHA; only Viv's final design approve remains before merge.
- [2026-11-25 07:45 UTC] lead final code review (Onyx, `aa1b18e` → merge `3cf1ef8`): **APPROVE**. Reanimated press feedback + reduced-motion paths, Today cascade, wardrobe stagger, capture flash, haptics on shutter/pick/washed/re-tag; T-017 rebase clean. Merge-result mobile tsc + eslint 0 after installing `expo-haptics` locally (fresh `npm ci` handles CI). Non-blocking: `isDisabled.value` written during render under React Compiler — watch for dev warnings on device. T-015 done; T-018/T-043 unblocked.
