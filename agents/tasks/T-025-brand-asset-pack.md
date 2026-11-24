---
id: T-025
title: Original brand asset pack — app icon, splash, adaptive/monochrome icons
status: in-progress
owner: Viv
priority: high
depends_on: []
files:
  - apps/mobile/app.json
  - apps/mobile/assets/brand/icon-master.png
  - apps/mobile/assets/brand/README.md
  - apps/mobile/assets/images/icon.png
  - apps/mobile/assets/images/splash-icon.png
  - apps/mobile/assets/images/favicon.png
  - apps/mobile/assets/images/android-icon-foreground.png
  - apps/mobile/assets/images/android-icon-background.png
  - apps/mobile/assets/images/android-icon-monochrome.png
branch: Viv/T-025
updated_at: 2026-11-24T19:54Z
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
