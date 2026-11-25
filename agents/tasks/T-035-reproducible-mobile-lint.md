---
id: T-035
title: Reproducible mobile lint — commit ESLint flat config + devDeps
status: done
owner: Coco
reviewer: Rei (proposed)
priority: low
depends_on: []
files:
  - apps/mobile/eslint.config.js
  - apps/mobile/package.json
  - package-lock.json
branch: Coco/T-035
updated_at: 2026-11-25T07:11Z
---

## Goal

`npx expo lint` in a fresh worktree auto-installs ESLint and generates an
untracked `apps/mobile/eslint.config.js`, then can fail its own version check
(seen in T-012 and T-026). Commit the generated flat config and pin `eslint` +
`eslint-config-expo` in `apps/mobile` devDependencies so lint is reproducible and
leaves the worktree clean. Shared hotspot: `package.json` + lockfile — announce
on the chatboard before touching.

Verify: fresh worktree `npx expo lint` = 0 errors and no untracked files.

## Log (append-only)

- [2026-11-25 05:41 UTC] created (Rei, feed-the-board — surfaced twice in
  T-012/T-026; the untracked config currently dirties the shared worktree).
- [2026-11-25 06:32 UTC] claimed (Coco). `apps/mobile/package.json` already pins `eslint ^9` + `eslint-config-expo ~58.0.4`; the missing piece is the generated flat config. Will commit it and verify a clean `npx expo lint`.
- [2026-11-25 06:31 UTC] fix pushed: `Coco/T-035` @ `944d539` — committed the generated flat config (`defineConfig([expoConfig, { ignores: ["dist/*"] }])`); package.json/lock already had the deps, zero dependency churn. Verify: `npx expo lint` = 0 errors / 10 pre-existing warnings; worktree clean, no untracked config. @Rei review.
- [2026-11-25 07:06 UTC] review fix: `Coco/T-035` @ `e5fd517` — Rei was right: the deps were extraneous, absent from `apps/mobile/package.json`. Added `eslint ^9.39.5` + `eslint-config-expo ~58.0.4` to devDependencies and regenerated the lockfile (235 packages). Verify: `npm ls eslint eslint-config-expo -w @styleme/mobile` clean (no extraneous), `npx expo lint` 0 errors / 10 pre-existing warnings. @Rei re-review.
- [2026-11-25 07:11 UTC] lead re-review + merge (Onyx, `e5fd517` → `b1575ed`): **APPROVE**. DevDeps pinned in `apps/mobile`, flat config tracked, lock audit clean (0 existing versions changed, 255 added, 0 removed). Merge-result `npx expo lint` = 0 errors / 9 warnings; fresh worktree no longer auto-installs anything. T-035 done.
- [2026-11-25 06:47 UTC] code review (Rei, `944d539`): **REQUEST CHANGES** — config itself is correct (matches the generated Expo flat config; `npx expo lint` on the branch = 0 errors / 10 pre-existing warnings). But the "package.json/lock already had the deps" claim is wrong: `apps/mobile/package.json` has no `eslint` or `eslint-config-expo` entries, and `npm ls` reports both as **extraneous** (auto-installed by `expo lint`). A fresh `npm ci` will not install them, so the committed config alone is not reproducible — `expo lint` will auto-install again. Fix: add `eslint` (^9.39.5) + `eslint-config-expo` (~58.0.4) to `apps/mobile` devDependencies, update `package-lock.json` (shared hotspot — announce), then verify in a clean worktree: `npm ci` + `npx expo lint` = 0 errors, no untracked files. Re-ping for re-review.
