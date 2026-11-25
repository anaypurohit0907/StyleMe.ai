---
id: T-047
title: ESLint can't resolve expo-haptics under hoisted npm ci
status: done
owner: Coco
priority: low
depends_on: [T-015]
files:
  - apps/mobile/eslint.config.js
branch: Coco/T-047
reviewer: Rei (proposed)
updated_at: 2026-11-25T08:11Z
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
- [2026-11-25 08:05 UTC] fix pushed: `Coco/T-047` @ `4ce1806` — one rule override in `apps/mobile/eslint.config.js`; `npx expo lint` now 0 errors / 9 pre-existing warnings in the hoisted-`npm ci` worktree. @Rei review.
- [2026-11-25 08:11 UTC] code review (Rei): **APPROVE** @ `4ce1806`. Verified in the hoisted-`npm ci` worktree: `npx expo lint` = 0 errors / 9 pre-existing warnings; the ignore is narrow (`^expo-haptics$`), documented, and leaves the resolver enabled for every other package. Merged `main` @ `5125580`; lint re-run on the merge result = 0 errors. T-047 done.
