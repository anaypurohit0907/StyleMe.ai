---
id: T-021
title: Engine integrity pass — coat diversity, accessories, explore math, tests
status: in-progress
owner: Marlow
priority: high
depends_on: []
files:
  - packages/engine/src/index.ts
  - packages/engine/src/explore.ts
  - packages/engine/src/candidates.ts
  - packages/engine/src/color.ts
  - packages/engine/src/rules.ts
  - packages/engine/src/preference.ts
  - packages/engine/tests/recommend.test.ts
  - packages/engine/tests/uniqueness.property.test.ts
  - packages/engine/tests/tone.test.ts
  - packages/engine/tests/preference.test.ts
  - packages/engine/tests/helpers.ts
  - packages/engine/tests/explore.test.ts
branch: Marlow/T-021
reviewer: Coco (engine domain owner, proposed) — lead confirm
updated_at: 2026-11-25T05:44Z
---

## Goal

Engine-audit findings, engine-only scope (from T-007): (1) cold weather
force-attaches the SAME coat to every outfit (`index.ts:132-139` picks best
outerwear by a candidate-independent center) and then the diversity greedy
taxes every option 0.35 for sharing it — pick per-candidate outerwear (the
comment already claims "closest to the candidate's formality center") or
exempt engine-attached pieces from the reuse penalty; also hoist the sort
out of the candidate loop; (2) accessories are generated, never attached
(`candidates.ts:34` options.accessories unread) — either attach them (mass
0.3, formality-aware, ≤1 per outfit) or remove the dead plumbing; (3)
`exploreScore` arithmetic: the `*0.6 … /0.6` cancels (dead code), spread
flattens to 0.3 whenever `best <= 0` (cold-weather totals can be negative
— silently disables exploration), and at n=0 the max kick is 0.04998 so
brand-new users are never flagged explored — fix the boundary and make
`meta.exploredSignatures` mean something; (4) `missingSlots` ignores
status: all-shoes-in-wash returns `outfits: []` with `missingSlots: []`
and no signal — report "all your shoes are in the wash" via meta; (5)
neutral-color list is hardcoded in 4 places (`color.ts:25-46` canonical,
plus copies in `explore.ts:127`, `index.ts:286`,
`apps/worker/src/index.ts:228`, `uniqueness.property.test.ts:88`) —
single export, import everywhere; (6) `context.mood` and the occasion on
pick events are stored then ignored (`preference.ts:88` `void ev.occasion`;
mood unread in all rules) — either consume (light: mood nudges
formality center, occasion-conditioned patternMixing) or delete the
fields — do not ship dead context; (7) test hygiene: fix the tautology
(`preference.test.ts:114-116`), the can't-fail rng assertion
(`tone.test.ts:53-60`), the dead ternary in `helpers.ts:45`, generous
assertions flagged in the audit (`recommend.test.ts:170-188`,
`uniqueness.property.test.ts:103-120`), and add the missing coverage:
empty wardrobe, all-in-laundry, dress+shoes vs schema min, neverMix
reason, `blendWeights` (currently zero tests), explore unit tests. Full
engine test suite + uniqueness property must pass (~25s pair with worker
per root AGENTS.md).

## Log (append-only)

- [2026-11-24 19:35 UTC] created (Vesper, from T-007 engine subagent sweep — findings #3,4,6,7,8,9,10,13,14).
- [2026-11-25 05:38 UTC] claimed (Marlow). Engine context fresh from T-012 (reasonSentence/rules/color/skippedNeverMix). Bonus scope noted from T-012 review: tie "Wildcard" badge label to meta.exploredSignatures (mobile follow-up rides T-032/T-015 — engine side = make exploredSignatures meaningful, that's finding (3)). Files pre-checked: no active-task overlap (T-011 owns tone.ts, not listed here). Branch Marlow/T-021 off current main; isolated worktree.
- [2026-11-25 05:44 UTC] files list extended before first touch: + engine/src/preference.ts (finding 6 lives there — `void ev.occasion` — but was missing from the original list) + new tests/explore.test.ts (missing explore coverage, finding 7). Note: finding 5 also names apps/worker/src/index.ts:228 (neutral-list copy) — file owned by Indigo's in-progress T-020, NOT touching; follow-up fed at done.
