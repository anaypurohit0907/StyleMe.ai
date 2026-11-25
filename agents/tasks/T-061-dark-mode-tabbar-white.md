---
id: T-061
title: Dark mode chrome — tab bar / Android navigation bar stays white
status: backlog
owner:
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/app.json
  - packages/design/src/tokens.ts
updated_at: 2026-11-25T12:16Z
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
