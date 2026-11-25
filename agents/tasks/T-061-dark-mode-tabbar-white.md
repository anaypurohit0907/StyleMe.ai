---
id: T-061
title: Dark mode chrome — tab bar / Android navigation bar stays white
status: in-progress
owner: Coco
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/app.json
  - packages/design/src/tokens.ts
branch: Coco/T-061
reviewer: Onyx (code) + Vesper (taste)
updated_at: 2026-11-25T12:21Z
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
