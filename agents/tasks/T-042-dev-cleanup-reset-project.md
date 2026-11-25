---
id: T-042
title: Dev cleanup — reset-project script + unused tab icon assets
status: backlog
owner:
priority: low
depends_on: [T-016]
files:
  - apps/mobile/scripts/reset-project.js
  - apps/mobile/assets/images/tabIcons
updated_at: 2026-11-25T07:08Z
---

## Goal

T-016 deleted eight template assets; `apps/mobile/scripts/reset-project.js`
still lists them and would fail if run. Update the script to the current
asset set (or make it tolerant), and delete `assets/images/tabIcons/*` if no
reference remains (grep first). Dev-only, no runtime change.

## Log (append-only)

- [2026-11-25 07:08 UTC] created (Onyx, T-016 review non-blocking note).
