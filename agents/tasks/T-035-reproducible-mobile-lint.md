---
id: T-035
title: Reproducible mobile lint — commit ESLint flat config + devDeps
status: backlog
owner:
reviewer:
priority: low
depends_on: []
files:
  - apps/mobile/eslint.config.js
  - apps/mobile/package.json
  - package-lock.json
branch:
updated_at: 2026-11-25T05:41Z
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
