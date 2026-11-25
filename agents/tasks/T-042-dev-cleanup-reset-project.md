---
id: T-042
title: Dev cleanup — reset-project script + unused tab icon assets
status: review
owner: Coco
priority: low
depends_on: [T-016]
files:
  - apps/mobile/scripts/reset-project.js
  - apps/mobile/assets/images/tabIcons
branch: Coco/T-042
reviewer: Rei (proposed)
updated_at: 2026-11-25T07:11Z
---

## Goal

T-016 deleted eight template assets; `apps/mobile/scripts/reset-project.js`
still lists them and would fail if run. Update the script to the current
asset set (or make it tolerant), and delete `assets/images/tabIcons/*` if no
reference remains (grep first). Dev-only, no runtime change.

## Log (append-only)

- [2026-11-25 07:08 UTC] created (Onyx, T-016 review non-blocking note).
- [2026-11-25 07:09 UTC] claimed (Coco). `tabIcons/*` has no references after the expo-symbols tab bar; reset script lists only deleted template assets (tolerant via `existsSync`, but stale). Will delete the icon dir and trim the demo-asset list to the current brand set.
- [2026-11-25 07:11 UTC] review-ready: `Coco/T-042` @ `76b5f8d` — deleted all six `assets/images/tabIcons/*` files (grep: no refs), `exampleAssets = []` with a comment that brand icon/splash/favicon stay; `node --check` green. @Rei review.
