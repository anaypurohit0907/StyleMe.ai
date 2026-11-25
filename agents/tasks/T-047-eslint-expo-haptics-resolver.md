---
id: T-047
title: ESLint can't resolve expo-haptics under hoisted npm ci
status: in-progress
owner: Coco
priority: low
depends_on: [T-015]
files:
  - apps/mobile/eslint.config.js
branch: Coco/T-047
reviewer: Rei (proposed)
updated_at: 2026-11-25T08:02Z
---

## Goal

Fresh `npm ci` hoists `expo-haptics` to the workspace root. `npx expo lint`
then reports four `import/no-unresolved` errors for `expo-haptics` imports
(T-015: index/capture/dna/item), while `tsc` and Metro resolve the package
fine. The package uses a conditional `exports` map (`expo-source`/default)
that the current flat config's import resolver does not follow.

Fix the ESLint resolver for hoisted workspace packages (or add a narrow,
documented `import/no-unresolved` ignore for `expo-haptics` until the
resolver supports `exports`). Verify in a clean worktree: `npm ci` then
`npx expo lint` = 0 errors.

## Log (append-only)

- [2026-11-25 07:55 UTC] created (Coco, surfaced during T-043 verification). Renumbered T-046 → T-047 (ID collision with the Android-emulator T-046).
- [2026-11-25 08:02 UTC] claimed (Coco). Root cause: `eslint-plugin-import` follows `expo-haptics`'s `expo-source` export condition to `./src/Haptics.ts`, which is not published; Metro/tsc use the `default` build. Fix: narrow documented `import/no-unresolved` ignore for `^expo-haptics$` (no broad disable).
