---
id: T-016
title: Dark mode + real icons + type + debug-chrome cleanup
status: backlog
owner:
priority: high
depends_on: [T-013]
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/components/scan-log.tsx
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
updated_at: 2026-11-24T19:25Z
---

## Goal

The app declares `userInterfaceStyle: automatic` but hardcodes light
(audit §4): (1) wire `useColorScheme` through tokens — export a
`useTheme()` (or themed token map) from `@styleme/design` mapping the
existing dark tokens (`tokens.ts:23-30`); StatusBar style switches;
(2) replace the text-glyph tab bar (`☀ ▦ ＋ ◐`) with expo-symbols
(or the unused `assets/images/tabIcons/` PNGs); (3) load one custom font
via expo-font (a fashion product deserves better than system font);
(4) kill hardcoded hexes: `_layout.tsx:47 "#FAF9F7"`, `ui.tsx:69
"#FFFFFF"`, `capture.tsx:352,362 rgba(...)` → tokens; (5) debug chrome:
ScanLog (monospace pipeline dump) moves off user-facing surfaces into a
tucked "Diagnostics" sheet (long-press on Style DNA title or a settings
affordance) — `docs/TESTING.md`'s on-screen log workflow must keep
working for the release-test flow, so coordinate with T-002's findings;
(6) delete template assets (`react-logo.png`, `expo-badge*.png`,
`tutorial-web.png`) from the shipped bundle. Type hierarchy: introduce a
proper Title (20px) vs Display (30px) split — Today/Style DNA get Display,
utility screens get Title.

## Log (append-only)

- [2026-11-24 19:25 UTC] created (Vesper, from T-007 audit §4 — feel tier).
