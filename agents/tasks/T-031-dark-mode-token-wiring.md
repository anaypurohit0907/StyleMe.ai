---
id: T-031
title: Dark-mode token wiring — useTheme + hardcoded hex cleanup (T-016 split)
status: review
owner: Wren
reviewer: Viv (proposed — design domain owner) · taste gate: Vesper
priority: high
depends_on: [T-013]
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/lib/theme.ts
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Wren/T-031
updated_at: 2026-11-24T20:51Z
---

## Goal

Split from T-016 (suggested by the waiting 11th session, chatboard 20:18) so
dark mode ships right after T-013 instead of waiting on the icons/font/
debug-chrome bundle. Dark tokens already exist (`tokens.ts:23-30`) — only the
wiring is missing: (1) export a theme layer from `@styleme/design` —
`useTheme()` hook or a `themed` token map that returns the light/dark variant
per `useColorScheme()`; keep the single-accent rule (accent constant across
themes unless contrast demands); (2) swap hardcoded hexes for tokens:
`_layout.tsx` `"#FAF9F7"`, `ui.tsx` Btn ghost fg `"#FFFFFF"`,
`capture.tsx` `rgba(250,249,247,…)` overlays (busyOverlay + camBar) — pick
theme-aware values; (3) StatusBar style follows scheme in `_layout.tsx`;
(4) screens listed above pass through the theme layer for bg/surface/ink.
No new deps. `app.json` already declares `userInterfaceStyle: automatic`.
T-016 keeps: tab-bar icons, custom font, ScanLog→Diagnostics move, template
asset deletion, Title/Display split — @Vesper (T-016 author) drop items (1)
and (4) from T-016's goal at its claim time to avoid double work.

## Log (append-only)

- [2026-11-24 20:29 UTC] created (Wren, feed-the-board from chatboard 20:18 split suggestion).
- [2026-11-24 20:45 UTC] claimed (Wren). dna.tsx dropped (stays with blocked T-008 — follow-up to feed post-T-008); lib/theme.ts added for the mobile-side hook. capture.tsx shared with Yves's T-024 per his OK — my edits = theme values only, disjoint from his log wiring; rebasing on his merge if import lines collide.
- [2026-11-24 20:51 UTC] review (Wren): `Wren/T-031` @ 46e6d51 + main synced (10c4727). (1) design: `themes` map (light/dark over 14 semantic tokens incl. `overlayStrong/Soft` for camera chrome) + `getTheme()` — flat `colors` export untouched, zero churn elsewhere; (2) `lib/theme.ts` `useTheme()` via useColorScheme; (3) ui.tsx kit fully theme-aware (Screen/Title/Body/Caption/Card/Btn/Chip/Swatch/Empty/Progress/AddedChip/TextLink — colors inline, layout stays in StyleSheet); (4) capture.tsx: overlays + indicators + preview/flashThumb via theme; guide border stays white (camera feed behind, both schemes); (5) wardrobe.tsx tiles/img inline-themed; (6) `_layout.tsx`: StatusBar style + Stack bg follow scheme. Verify: fresh-install `tsc --noEmit` green; `expo lint` — my files clean, 4 errors pre-existing (T-026). No new deps; single-accent rule kept (accent constant both themes).
