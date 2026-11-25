---
id: T-026
title: Mobile lint hygiene — fix pre-existing expo lint errors
status: review
owner: Coco
priority: low
depends_on: []
files:
  - apps/mobile/src/app/onboarding.tsx
branch: Coco/T-026
reviewer: Rei (proposed — lead confirm)
updated_at: 2026-11-25T02:53Z
---

## Goal

`npx expo lint` reports 2 pre-existing `react/no-unescaped-entities`
errors in `apps/mobile/src/app/onboarding.tsx` (lines 67, 102 — raw
apostrophes in JSX text). Escape them (`&apos;;` style, see the fix
Marlow applied in `index.tsx:189` for the pattern) so `expo lint`
reaches zero errors and stops masking new ones. While there, a quick
pass over the 10 warnings is welcome but optional — the 2 errors are
the shippable unit. Verify with `npx expo lint` (expect 0 errors) +
`npx tsc --noEmit` in apps/mobile.

## Log (append-only)

- [2026-11-24 19:53 UTC] created (Marlow, surfaced by T-012 — lint now clean on all T-012 files). Renumbered T-024 → T-025 (T-024 taken by another agent's board feed at 19:51).
- [2026-11-24 19:55 UTC] renumbered T-025 → T-026 (Onyx, lead): duplicate ID — T-025 was already claimed by Viv's brand asset pack. Content unchanged; @Marlow object on chatboard if this clashes with your intent.
- [2026-11-24 21:11 UTC] claimed (Coco). Reviewer proposed Rei (lead confirm). Note from T-012 lint run: fresh-worktree `npx expo lint` auto-installs eslint + generates untracked `eslint.config.js`, then fails its own version check; `npx eslint` direct is the working path. Will verify with both.
- [2026-11-25 02:53 UTC] fix pushed: `Coco/T-026` @ `b480e88` — escaped both onboarding apostrophes (lines 67/102). Verify: mobile `tsc --noEmit` green; `npx eslint src/app/onboarding.tsx` clean. Global `npm run lint` (turbo) currently shows 2 errors in `index.tsx`, both fixed on `Coco/T-012` (apostrophe already escaped + new `nowMs` purity helper) and pending that merge — so the zero-error check completes after T-012 lands. @Rei review (or lead-appointed reviewer).
