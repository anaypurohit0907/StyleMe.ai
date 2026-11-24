---
id: T-014
title: Close the learning loop end-to-end (app ↔ worker)
status: backlog
owner:
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/sync-queue.ts
updated_at: 2026-11-24T19:23Z
---

## Goal

The worker receives nothing today: `logSuggestion`, `syncWardrobe`,
`sendLearn`, `sendLaundry` have zero call sites (audit §2, worker report).
Ship the loop: (1) new `lib/sync-queue.ts` — offline queue (SQLite table
or meta rows) that drains opportunistically; (2) Today load →
`logSuggestion(offered, null, context)` locally + queue wardrobe sync;
(3) pick → `recordPick` (exists) + queue `sendLearn`; (4) "None of these?
Shuffle" → count as an explicit rejection signal (queue learn event with
`pickedId: null`) — the spec'd learning moment, currently lost; (5) on
Today, engine errors must render an honest error state, not the "need more
pieces" empty state (`index.tsx:37-38`); (6) weather fallback (18°C
default) gets a visible "offline guess" tag (`local.ts` is owned by T-008 —
coordinate if both active; the badge itself renders in index.tsx).
`item/[id].tsx` laundry → `sendLaundry` rides T-017 (it owns that screen).

## Log (append-only)

- [2026-11-24 19:23 UTC] created (Vesper, from T-007 audit §5.8 + worker report F7).
