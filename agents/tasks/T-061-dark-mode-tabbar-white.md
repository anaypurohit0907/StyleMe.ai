---
id: T-061
title: Dark mode chrome — tab bar / Android navigation bar stays white
status: done
owner: Coco
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/app.json
  - packages/design/src/tokens.ts
  - apps/mobile/package.json
  - package-lock.json
branch: Coco/T-061
reviewer: Onyx (code) + Vesper (taste)
updated_at: 2026-11-26T01:28Z
---

## Goal

Anay bug report: in dark mode the screens go dark but the **bottom tab
bar / Android navbar stays white**. The tab bar already sets
`backgroundColor: t.surface`, so verify the actual culprit with a device
screenshot: React Navigation safe-area inset below the 64px bar, Android
system navigation bar, or a light-mode fallback in `useTheme`.

Fix so there is **no white strip** in dark mode: theme the tab bar's full
safe-area height, set the Android navigation bar style/color (via
`expo-navigation-bar` or `app.json` config) to match `bg`, and keep light mode
unchanged. Device verify in both schemes; screenshot both.

## Log (append-only)

- [2026-11-25 12:16 UTC] created (Onyx, Anay device bug report via relay).
- [2026-11-25 12:21 UTC] claimed (Coco). Plan: reproduce with a dark-mode screenshot when the phone frees; likely the tab bar's explicit 64px height not covering the bottom safe-area inset + window root background staying light. Fix: include `useSafeAreaInsets().bottom`, set the root background via `expo-system-ui` on scheme change, and verify the Android nav bar in both schemes. No new dep expected.
- [2026-11-25 12:28 UTC] code pushed: `Coco/T-061` @ `90d3083` — `expo-system-ui` keeps the root window background on `t.bg` (behind nav bar/safe-area gaps); tab bar height + bottom padding now include `useSafeAreaInsets().bottom`. Verify: mobile tsc + eslint clean. Needs dark/light device screenshots before review (phone queue: Viv visual → Indigo T-059 rider).
- [2026-11-25 12:31 UTC] review-ready: `Coco/T-061` @ `7a410c0` — added `expo-navigation-bar ~58.0.4` declarative `<NavigationBar style="auto" />` (Android-only, scheme-aware buttons) + SystemUI root background; tab bar inset from 90d3083. tsc + eslint 0. Repro attempt on the attached phone: dark gesture + 3-button screenshots show dark chrome, no white strip — likely OEM/edge-case, so this is the defensive fix; post-merge APK screenshot both schemes still required. @Onyx code + @Vesper taste.
- [2026-11-25 12:39 UTC] final SHA `a88f5fe`: added the `expo-navigation-bar` config plugin with `enforceContrast: false` (docs: explicit button style only takes effect then; the bar stays translucent over the root bg). `expo config` parses. tsc/eslint/export green.
- [2026-11-25 13:06 UTC] device smoke (Yves, 12:44 main APK): dark nav/tab median **(28,28,26)** vs content **(17,17,16)**; light nav/tab **(255,255,255)** vs content **(250,249,247)**; no crash/reload errors. Screenshots `/home/anay/tmp-yves/t061-dark.png` + `t061-light.png`. Device gate satisfied; per lead, final screenshots run on the T-062 APK and T-061/T-062 close together.
- [2026-11-25 13:36 UTC] final device screenshots on the T-062 APK (`apk-latest`, 13:24): `/home/anay/t062-light.png` + `/home/anay/t062-dark.png` — dark tab/nav chrome has no white strip, light unchanged. Code Onyx-approved (`e350f4f`), taste structural APPROVE (Vesper), device gate PASS. T-061 done; T-062 closes on Vesper's screenshot taste.
- [2026-11-25 12:50 UTC] lead code review (Onyx, `a88f5fe` → merge `e350f4f`): **APPROVE code**. Root `SystemUI` background follows the scheme, Android `NavigationBar style="auto"` + `enforceContrast:false`, tab bar height/padding include `insets.bottom`. Mobile tsc + eslint 0 after installing `expo-navigation-bar`. **Post-merge dark/light screenshots + Vesper taste pending** — task stays review.
- [2026-11-25 12:35 UTC] taste gate (Vesper, on merged e350f4f/a88f5fe): **structural APPROVE** — root bg + nav-bar auto + tab inset + expo-navigation-bar plugin config all verified; tokens file untouched (chrome follows theme, single accent intact). Visual confirmation rides Coco's two-scheme screenshots (I have no image input in this session — @user glance post-install closes it). Gate CLEARED pending screenshots → done.

- [2026-11-25 13:45 UTC] **reopened (Onyx, Anay device rejection):** do not close until the T-062 visual rework lands and both schemes pass a vision-capable screenshot review. Nav-bar/white-strip fix itself measured clean; final acceptance rides T-062.
- [2026-11-26 01:28 UTC] final visual (Onyx): dark nav/tab bar dark with glass, light opaque; no white strip in either scheme on the T-062 APK. T-061 done.
