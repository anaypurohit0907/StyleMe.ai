---
id: T-018
title: Retention moments — streaks, first-outfit, spaced polls
status: review
owner: Viv
reviewer: Onyx
priority: medium
depends_on: [T-011, T-014]
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/local.ts
  - packages/engine/src/tone.ts
  - docs/TONE_KEYS.md
branch: Viv/T-018
updated_at: 2026-11-25T08:02Z
---

## Goal

Nothing in the app marks a moment (audit §4): no streak counter, no
first-outfit celebration, no polls — yet the tone banks already ship
"you're on a streak, iconic" (`tone.ts:28`). Ship the retention loop from
PLAN.md §3.5: (1) pick-streak counter (consecutive days with a logged
wear) + milestone celebrations on Today (days 3/7/14/30), tone-voiced;
(2) first-outfit moment: confetti-grade (but tasteful, token-consistent)
celebration on the very first "Wear this"; (3) spaced one-tap polls on
Style DNA (day 3/10/30): "more stripes or solids?", each answer nudges
the preference vector visibly (bar animates) — the trust loop made
tangible; (4) all copy through `toneText` (hence T-011 dep). Coordinate:
index.tsx/dna.tsx/local.ts overlap T-014 and T-008 file lists — claim
after those land or sync with owners.

## Log (append-only)

- [2026-11-24 19:27 UTC] created (Vesper, from T-007 audit §7 — depth tier).
- [2026-11-25 07:46 UTC] claimed (Viv) — T-011/T-014 done, T-015 merged, files
  free. Branch `Viv/T-018` off current main; reviewer Onyx, taste Vesper.
  Files list extended before first touch with `tone.ts` + `docs/TONE_KEYS.md`
  for the two new canonical keys (`first_outfit`, `poll_invite`); engine tone
  bank tests already iterate every genz key and will catch missing banks.
  Plan: local wear-streak/first-outfit/poll helpers in `local.ts`, streak card
  + first-pick moment on Today, day-3/10/30 poll card on DNA with animated
  bars; no new deps (reanimated already in).
- [2026-11-25 08:02 UTC] status → review (`Viv/T-018` @ `55925e8`, based on
  `main@32fdf3c`). Today: `getWearStreak` counts consecutive local days with a
  logged wear (today or yesterday keeps it alive; older resets to 0), streak
  card from 2 days, accent + once-per-streak-per-day tone toast on
  3/7/14/30, and the first `Wear this` shows the `first_outfit` moment (wear
  count checked before `logWear`). DNA: `getPendingPoll` unlocks by wardrobe
  age (earliest `added_at`) at day 3/10/30, one card at a time, highest
  unlocked wins; answering nudges the chosen attribute +0.25 / other −0.1,
  retires earlier milestones, leaves `n` honest, and `BarFill` animates the
  affected bar via reanimated (reduce-motion aware). Copy goes through two new
  tone keys (`first_outfit`, `poll_invite`) in all three banks + TONE_KEYS.
  Verify: mobile/engine `tsc` green; eslint 0 on all three files; engine 71/71
  (tone bank coverage test caught the new keys) + worker 22/22. Device/emulator
  visual pass still useful for the bar animation. @Onyx code review + @Vesper
  taste (streak/first-outfit copy + poll questions).
