---
id: T-043
title: Wardrobe filters + loading skeleton + bulk wash
status: done
owner: Coco
priority: medium
depends_on: [T-015]
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Coco/T-043
reviewer: Rei (proposed) + Vesper (taste gate)
updated_at: 2026-11-25T08:07Z
---

## Goal

Remainder of T-017 split out so Marlow's T-015 motion pass owns
`wardrobe.tsx` without a file war (lead merge order 07:19):

1. Filters per PLAN.md:186 — slot (exists) + color family + status chips.
2. Loading skeleton (blank frame today) and distinct copy for filtered-empty
   ("no dresses — add one?" ≠ "nothing here yet").
3. "All washed" bulk action — set every `in_wash` piece back to `available`
   (enqueue T-014 `washed` laundry events in one batch).

No new deps. Rebase on T-015 before touching. Taste gate: Vesper.

## Log (append-only)

- [2026-11-25 07:20 UTC] created (Coco, split from T-017 per lead merge order).
- [2026-11-25 07:50 UTC] claimed (Coco). T-015 merged (`3cf1ef8`), so `wardrobe.tsx` is free. Will add color-family + status filters, loading skeleton, distinct filtered-empty copy, and an "All washed" bulk action that enqueues T-014 `washed` events.
- [2026-11-25 07:55 UTC] review-ready: `Coco/T-043` @ `e6dbc33` — slot + status + color-family filters (neutral/color via engine `isNeutral`), 4-tile loading skeleton, distinct filtered-empty with Clear filters, `All washed` bulk (sets available + one T-014 `washed` batch event). Verify: tsc ×4, engine 71 + worker 22, eslint 0 errors on `wardrobe.tsx`, `expo export --platform android` green. Note: global `expo lint` in this hoisted `npm ci` worktree shows 4 pre-existing `import/no-unresolved` for `expo-haptics` (T-015 imports) — fed T-047. @Rei code + @Vesper taste.
- [2026-11-25 08:00 UTC] lead code review (Onyx, `e6dbc33` → merge `1fb8fd8`): **APPROVE code**. Filters/skeleton/filtered-empty/bulk washed correct; merge-result mobile tsc + eslint clean. Non-blocking: bulk laundry sends every in-wash id in one event (T-037 cap 100) — fed T-048 (chunk by 100). Taste pending.
- [2026-11-25 08:07 UTC] taste gate (Vesper): **APPROVE** — filtered-empty/bulk-wash/skeleton close their audit items; copy reads human. Both gates clear; T-043 done (code `1fb8fd8`). Follow-up T-048 tracks >100-item chunking.
- [2026-11-25 08:00 UTC] lead code review (Onyx, `e6dbc33` → merge `1fb8fd8`): **APPROVE code**. Filters (slot/status/neutral-color), skeleton, filtered-empty copy, bulk washed all correct; merge-result mobile tsc + eslint clean. Non-blocking: `allWashed()` sends one laundry event with every in-wash id — the T-037 cap is 100, so >100 in-wash items would poison the queue; fed T-048 (chunk by 100). **Taste gate pending (Vesper)** — task stays `review` until copy clears.
