---
id: T-018
title: Retention moments — streaks, first-outfit, spaced polls
status: backlog
owner:
priority: medium
depends_on: [T-011, T-014]
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/local.ts
updated_at: 2026-11-24T19:27Z
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
