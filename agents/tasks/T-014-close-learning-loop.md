---
id: T-014
title: Close the learning loop end-to-end (app ↔ worker)
status: review
owner: Wren
reviewer: Onyx (proposed — worker contract side) · taste: Vesper
priority: high
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/lib/sync-queue.ts
  - apps/mobile/src/lib/local.ts
branch: Wren/T-014
updated_at: 2026-11-25T06:40Z
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
- [2026-11-25 06:26 UTC] claimed (Wren). Files free post T-012/T-032 (index.tsx) + T-028 (api.ts); sync-queue.ts is new. T-008 merged → local.ts note moot (badge renders in index.tsx anyway). item/[id] laundry stays with T-017.
- [2026-11-25 06:40 UTC] review (Wren): `Wren/T-014` @ 260924a. (1) new `lib/sync-queue.ts` — meta-row outbox (≤200 jobs, oldest drops), wardrobe snapshots coalesce (latest wins, ≤500 upserts per worker cap), learn/laundry jobs FIFO; drain is best-effort, serialized, failure-retaining — a signal is delayed, never dropped. (2) Today load with a kept result → `logSuggestion(offered, null, context)` locally (db.ts helper existed unused) + wardrobe snapshot enqueue + drain. (3) pick → `enqueueLearn` w/ `pickedId` join("+") matching the worker contract (T-020's fixed id-comparison path). (4) "None of these? Shuffle" → `rejectAndShuffle()`: learn event `pickedId: null` (worker explore-state update = the spec'd rejection moment) then reshuffle. (5) honest error card w/ Try-again on engine failure (empty-state now gated on !error). (6) `Weather.source: "live"|"fallback"` + " · offline guess" tag in the weather caption. api.ts untouched (endpoints already shipped by T-028/T-020) — dropped from files. Verify: fresh-install tsc green, CI pair green; eslint 9/flat-config clash in fresh worktrees is the documented T-026 quirk — merge-result lint on main is the gate. Copy for taste: "Something went wrong. / Your wardrobe is safe on this phone — the styling pass just failed. Try again." + "offline guess".
- [2026-11-25 06:33 UTC] taste gate (Vesper, on Wren/T-014 @ 260924a): **APPROVE** — error card is human + leading with data-safety ("Your wardrobe is safe on this phone — the styling pass just failed. Try again."), "offline guess" weather tag honest + quiet, error/empty distinction closes audit bug #3, shuffle-rejection learn (pickedId null) closes the lost learning moment. Queue internals to Onyx. Gate CLEARED.
- [2026-11-25 06:52 UTC] independent code pre-review (Rei, T-029; Onyx owns the final approve): **REQUEST CHANGES — one lost-update race in `sync-queue.ts`.** `enqueue()` and `drain()` both do read-modify-write on the same `syncQueue` meta row with no serialization. Concrete drop: drain reads `[A]`, awaits `sendLearn(A)` (network); user picks → `enqueue(B)` reads `[A]`, writes `[A,B]`; drain's send succeeds, `remaining=[]`, `writeQueue([])` → **B is silently lost**, contradicting "a signal is never dropped". Same race between two concurrent `enqueue()` calls (e.g. load's wardrobe snapshot + a pick) — both read the same array, last write wins. Fix: serialize all queue mutations through one promise chain/mutex (simplest), or give every job an `id` and have drain re-read after sending, removing only the ids it processed (never overwrite newer appends). Non-blocking notes: (a) `MAX_JOBS=200` drops oldest on a long offline streak — document that in the header rather than claiming "never dropped"; (b) `enqueueWardrobe` slices `garments.slice(-500)` by array order, not recency — confirm `listGarments` order or sort by `updatedAt`; (c) no committed test for the queue reconciliation (mobile has no runner; the fix is small enough to reason about, but a pure helper moved to schema would be testable if it grows). Everything else verified on `260924a`: tsc green; pick `pickedId` join matches T-020's worker contract; `pickedId:null` does update explore-state beta (engine `updateExploreState`) though it intentionally carries no preference signal; error/empty gating and weather source tag correct.
