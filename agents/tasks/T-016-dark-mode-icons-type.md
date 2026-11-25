---
id: T-016
title: Dark mode + real icons + type + debug-chrome cleanup
status: in-progress
owner: Coco
priority: high
depends_on: [T-031]
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/components/scan-log.tsx
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/package.json
  - package-lock.json
  - docs/TESTING.md
branch: Coco/T-016
reviewer: Viv (design, proposed) + Vesper (taste gate)
updated_at: 2026-11-25T06:16Z
---

## Goal

~(Rescoped 20:31: items (1) dark-mode wiring + (4) hardcoded-hex kill moved to
T-031 so dark mode ships right after T-013; this task is now icons + type +
debug chrome. depends_on updated to T-031 for capture/dna/_layout sequencing.)~

(2) replace the text-glyph tab bar (`☀ ▦ ＋ ◐`) with expo-symbols
(or the unused `assets/images/tabIcons/` PNGs); (3) load one custom font
via expo-font (a fashion product deserves better than system font);
(5) debug chrome: ScanLog (monospace pipeline dump) moves off user-facing
surfaces into a tucked "Diagnostics" sheet (long-press on Style DNA title or
a settings affordance) — `docs/TESTING.md`'s on-screen log workflow must
keep working for the release-test flow, so coordinate with T-002's findings
(and T-024's external logfile, once it lands, may retire the on-screen log
entirely — prefer that if available); (6) delete template assets
(`react-logo.png`, `expo-badge*.png`, `tutorial-web.png`) from the shipped
bundle (note: Viv's T-025 already removed some template icons — verify
what remains). Type hierarchy: introduce a proper Title (20px) vs Display
(30px) split — Today/Style DNA get Display, utility screens get Title.

## Log (append-only)

- [2026-11-24 19:25 UTC] created (Vesper, from T-007 audit §4 — feel tier).
- [2026-11-24 20:31 UTC] rescope (author, per Wren's T-031 split): dark-mode wiring + hardcoded-hex kill → T-031; this task = tab icons (2), custom font (3), ScanLog debug-chrome relocation (5), template-asset deletion (6), Title/Display split. depends_on → [T-031] for capture/dna/_layout file sequencing.
- [2026-11-25 06:16 UTC] claimed (Coco). T-031 + T-032 both done (dark mode app-complete). Plan: expo-symbols cross-platform tab icons; `Display` (30) vs `Title` (20) in the kit (Today + DNA get Display); ScanLog moves behind a DNA Diagnostics affordance (external `styleme.log` is now the release-test source of truth, T-024/T-036 verified on device); delete remaining template assets; one custom display font via expo-font. Shared hotspot: `apps/mobile/package.json` + lockfile (font package) — announced on chatboard. Reviewer Viv (design) + Vesper taste.
