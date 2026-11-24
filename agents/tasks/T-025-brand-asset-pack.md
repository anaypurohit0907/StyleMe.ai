---
id: T-025
title: Original brand asset pack — app icon, splash, adaptive/monochrome icons
status: review
owner: Viv
priority: high
depends_on: []
reviewer: Onyx
files:
  - apps/mobile/app.json
  - apps/mobile/assets/expo.icon/
  - apps/mobile/assets/images/icon.png
  - apps/mobile/assets/images/splash-icon.png
  - apps/mobile/assets/images/favicon.png
  - apps/mobile/assets/images/android-icon-foreground.png
  - apps/mobile/assets/images/android-icon-background.png
  - apps/mobile/assets/images/android-icon-monochrome.png
  - packages/design/brand/mark.svg
  - packages/design/brand/icon-master.png
  - packages/design/brand/icon-dark.png
  - packages/design/brand/icon-source.jpg
  - packages/design/brand/README.md
branch: Viv/T-025
updated_at: 2026-11-24T20:04Z
---

## Goal

Every shipped icon is still the Expo template (blue "A" mark, grid background,
Expo badge/logo). The app promises a warm, editorial fashion identity; the
launcher is the first pixel a user sees and it says "starter project".
Replace the whole brand asset set with one original StyleMe mark and wire it
through Expo config:

1. One 1024x1024 master mark, flat, using only design tokens: warm cream
   `#FAF9F7` and single accent rust `#B4552D` (`packages/design/src/tokens.ts`).
   No gradients, no shadows, no text, generous safe padding.
2. `icon.png` (iOS/root, 1024, opaque, no rounded corners), `splash-icon.png`
   (transparent mark for the `#111110` splash), `favicon.png` (web),
   `android-icon-foreground.png` (transparent, mark inside the 66% adaptive
   safe zone), `android-icon-background.png` (solid `#111110` or removed in
   favour of `backgroundColor`), `android-icon-monochrome.png` (single-colour
   silhouette for Android 13 themed icons).
3. `app.json`: stop overriding iOS with the Expo `.icon` project
   (`assets/expo.icon`) so the generated icon is used everywhere; drop the
   template adaptive background image if a solid colour does the job.
   Shared hotspot — announce on chatboard before editing.
4. Delete the template assets only if nothing references them (grep first;
   T-016 also owns template-asset cleanup — coordinate).
5. Verify: `npx expo config --type public` parses, image dimensions/alpha
   checked, `npx expo lint` + mobile `tsc --noEmit` unchanged.

## Log (append-only)

- [2026-11-24 19:54 UTC] created + claimed (Viv, user order: use image-generation
  capability to help the team; no task covered the default launcher identity).
  Files pre-checked: `assets/expo.icon` untouched, `app.json` announced before edit.
- [2026-11-24 20:08 UTC] scope refined before first touch: brand sources live in
  `packages/design/brand/` (not under `apps/mobile`, where `assetBundlePatterns:
  ["**/*"]` would ship them); capped to flat two-token master. `reviewer: Onyx`
  set per TEAM.md §5. T-025 ID collision with Marlow's lint task resolved by them
  to T-026; board duplicate row is theirs to fix.
- [2026-11-24 20:02 UTC] status → review (branch `Viv/T-025` @ `8160ad9`, isolated
  worktree; branched off `main` @ `e3c0ce8`). Shipped: flat rust S / cream
  master (vector `packages/design/brand/mark.svg`, potrace-traced then rendered
  at 2048 and downsampled), dark variant kept unwired, transparent cream splash
  mark, Android adaptive foreground + monochrome inside the 66% safe zone,
  64px favicon; removed Expo `.icon` project + grid adaptive background
  (unreferenced — grep clean), splash `imageWidth` 76→120 for presence.
  Verify: `expo config --type public` parses with root icon + solid adaptive bg;
  images check (icon 1024 RGB opaque, splash/adaptive/mono 1024 RGBA, favicon
  64); typecheck set 4/4 green; engine 44/44 + worker 8/8 green; `expo lint`
  unchanged (only pre-existing T-026 errors in index/onboarding). No runtime
  code touched. @Onyx review please; surface is user-facing so @Vesper taste
  gate welcome. Coord commit strands on Wren/T-023 (main ahead) — mirror at will.
- [2026-11-24 20:04 UTC] lead review (Onyx, `8160ad9`): **REQUEST CHANGES** — one
  source-of-truth defect: `packages/design/brand/mark.svg` path fill is
  `#000000`, while README/Goal say the master is rust `#B4552D`; regenerating
  from the stated source yields black icons. Set the fill to `#B4552D` (keep
  the dark variant as its own file/recipe). Everything else approved: shipped
  sizes/alpha correct (icon 1024 RGB opaque; splash/adaptive/mono 1024 RGBA;
  favicon 64), adaptive foreground bbox 380x594 at +322,+215 sits inside the
  66% safe zone, colors exactly tokens (`#FAF9F7`/`#B4552D`, splash `#F2F0EB`
  on `#111110`), `.icon` project + background image unreferenced (grep clean),
  `expo config` parses. Taste: the S reads at 48 px and is on-brand; Vesper's
  gate is optional. Re-review after the one-line SVG fix; PNG re-render not
  needed since shipped assets already match the palette.
