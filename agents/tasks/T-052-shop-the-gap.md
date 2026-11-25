---
id: T-052
title: Shop-the-gap — text-only wardrobe gap suggestions
status: review
owner: Viv
reviewer: Onyx
priority: high
depends_on: [T-017, T-018]
files:
  - packages/engine/src/gap.ts
  - packages/engine/src/index.ts
  - packages/engine/tests/gap.test.ts
  - apps/mobile/src/app/gap.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Viv/T-052
updated_at: 2026-11-25T10:20Z
---

## Goal

PLAN phase 7: turn wardrobe gaps into a short, human "what to add next" list —
text only, no commerce links, no photos. Engine-side pure `gapAnalysis()`:

- Missing core slots first (shoes/dress/top+bottom), then thin slots.
- Subtype/color coverage: e.g. "no warm layer", "one bottom does all the work",
  "no shoe that works for office", derived from attrs + wear frequency.
- Return ranked `{ title, why, priority }` (max 5), deterministic, tested.

Mobile: a Gap screen reachable from Wardrobe's empty/filters area and a quiet
CTA; copy routed through the tone bank (`gap_suggestion` key already exists);
honest empty state ("nothing obvious — your wardrobe is balanced").

No external commerce, no affiliate, no network. Taste gate required.

## Log (append-only)

- [2026-11-25 08:55 UTC] created (Onyx, PLAN phase 7; next wave after audit
  set closed).
- [2026-11-25 09:53 UTC] claimed (Viv, lead-assigned engine half). Branch
  `Viv/T-052` off current main; reviewer Onyx. Starting with pure
  `gapAnalysis()` + tests; mobile Gap screen follows after the T-046 artifact
  smoke (wardrobe.tsx is not touched until then). No external commerce.
- [2026-11-25 10:03 UTC] engine half pushed: `Viv/T-052` @ `2aa0069`.
  `gapAnalysis()` returns max 5 ranked `{id,title,why,priority}`, deterministic
  (priority desc, id tiebreak), retired ignored / in-wash owned. Rules: core
  slots first, warm layer (missing or light-only), thin bottom/top/shoe depth,
  office shoe, dress-up formality, warm-weather coverage, all-neutral palette,
  accessory; empty wardrobe returns the core-three card. 11 new tests (empty,
  retired/in-wash, ranks, cap, determinism, color, warm-weather). Verify:
  engine typecheck + **90/90** tests. Mobile half still pending the T-046
  artifact smoke / lead go-ahead; task stays in-progress.
- [2026-11-25 10:20 UTC] engine half approved + merged (`main@4fd1fe2`); mobile
  half pushed: `Viv/T-052` @ `6b3e057`. New `/gap` screen: loads the local
  wardrobe, renders the ranked list (top pick accent, max 5, "Top pick/Next
  up"), balanced empty state, and a text-only/no-shop-links line; `gap_suggestion`
  tone key is the eyebrow. Wardrobe gets a quiet `TextLink` in the header plus
  both empty states, no tabs/route config needed. Verify: mobile + engine tsc
  green; eslint 0 on `gap.tsx` + `wardrobe.tsx`; engine 90/90. No device visual
  yet (T-046 CI lane pending); layout uses only the existing kit. @Onyx code
  review + @Vesper taste (CTA/heading/empty copy). Task → review.
- [2026-11-25 10:16 UTC] lead review — engine half (Onyx, `2aa0069` → merge `4fd1fe2`): **APPROVE**. `gapAnalysis()` is pure/deterministic, retired excluded, in-wash counted as owned (no duplicate-buy nudge), priority ordering + max 5 sane, 11 tests. Merge-result engine **90/90** + tsc green. Mobile Gap screen stays in-progress; tone-wrap copy at the UI.
