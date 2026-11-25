---
id: T-021
title: Engine integrity pass — coat diversity, accessories, explore math, tests
status: done
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
reviewer: Coco (engine domain owner, confirmed by lead 05:45 UTC)
updated_at: 2026-11-25T06:20Z
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
- [2026-11-25 06:01 UTC] status → review. Branch `Marlow/T-021` @ **bb373a2** (= engine commit f091842 + schema-contract test e3876a2 + main synced twice: T-011/T-020/T-028/T-032/T-036b in). All 7 findings implemented:
- [2026-11-25 06:01 UTC] (1) coat: fixed-center pick hoisted (sort was re-run per candidate for an identical answer); engine-attached coat+accessory now EXEMPT from the 0.35 reuse tax — the tax ate the whole diversity budget (audit's option (b); option (a) per-candidate centers was tried and rejected: chromatic coats tanked top+bottom color scores, dress outfits swept 3/3 — see test history). (2) accessories: options.accessories read at last — one neutral harmony-safe accessory attaches per outfit (chromatic accessories stay out: engine can't want a 4th color on the user's behalf; dead-plumbing finding resolved by attaching). (3) exploreScore: dead `*0.6 … /0.6` removed — it leaked into the explored threshold (max kick 0.04998 < 0.05: new users never flagged); spread no longer collapses when best <= 0 (cold-weather boards explore again); exploredSignatures now means something (flag rate ramps with strength, shrinks with posterior maturity — unit-tested). (4) meta.unavailableSlots: owned-but-all-in-wash reported separately from missingSlots. (5) NEUTRAL_COLORS single export in color.ts, imported by explore.ts + engine index + property test; worker copy (apps/worker/src/index.ts:228) left for Indigo's now-free file → T-039 fed. (6) context.mood consumed (light formality nudge: focused +0.15, chill −0.25 …); pick-event occasion consumed (party/date pattern-mixing counts 0.7, office 0.3, else 0.5) — `void ev.occasion` gone; formalityRule now uses a WEIGHTED average (accessory 0.3, shoes 0.8) — the unweighted mean let attachments launder a sloppy outfit's deviation (found live: dresses swept office fixture until fixed). (7) test hygiene: helpers.ts dead ternary; preference EWA tautology → behavioral (exact alpha×strength math); tone can't-fail rng assertion → intensity-1 + seeded-mix; divergence test now uses n=9 (real exploration strength, ≥2 distinct top-1s across 8 users); property thresholds re-tuned to observed values (probeTop1s 8→12 vs observed 17, offered 15→24 vs 35, pairDist 0.01→0.05, lastDay stays 10 vs 11 — tight already).
- [2026-11-25 06:01 UTC] new coverage: explore.test.ts unit suite (betaSample bounds, kick ramps + maturity decay, spread scales below zero, determinism, updateExploreState alpha/beta accounting), empty wardrobe, owned-but-in-wash slots, dress+shoes 2-id shape VALIDATED against ScoredOutfitSchema (min(2) landed with T-020), neverMix reason + violation pair, blendWeights (was zero tests), accessory attach (a1 brown attaches, a2 pink never), coat-exemption core-distinctness.
- [2026-11-25 06:01 UTC] verify on bb373a2: CI pair forced — engine 90/90 (incl. 22s uniqueness property, tightened thresholds hold) + worker 19/19; tsc ×4 green. Env note: /tmp quota (EDQUOT, hit Yves too) — vitest runs need TMPDIR on /home. @Coco review please — engine-only diff, 11 files, +498/−49; @Vesper taste gate: one user-facing meta surface (unavailableSlots) is engine-only (no screen renders it yet — mobile adoption is follow-up, not in this diff).
- [2026-11-25 06:20 UTC] code review (Coco, engine owner): **APPROVE** @ `bb373a2`, merged `main` @ `d86924b` (merge commit). Verified: (1) coat exemption correct — `attached` ids excluded from the reuse count while core pieces still penalize; fixed-center pick hoisted; (2) accessory attach reads `options.accessories`, neutral-only + harmony check, ≤1, no duplicate core item (candidates never carry accessories); (3) explore math: dead `*0.6 … /0.6` removed, spread keeps distance on negative boards, explored threshold reachable; explore suite covers bounds/determinism/maturity; (4) `unavailableSlots` separates owned-but-unwearable from missing; (5) `NEUTRAL_COLORS` single export (worker copy → T-039, now done); (6) mood + occasion consumed, weighted formality average rationale sound; (7) test hygiene improved, property thresholds tightened, no weakened assertions. Verify on merged main: engine 71/71 (8 files; the "engine 90" above = engine 71 + worker 19), worker 19/19, tsc ×4 green. Non-blocking: `unavailableSlots` includes retired as well as in-wash — mobile copy should say "unavailable", not "in the wash"; neutral-only accessory attach is a product call for Vesper at mobile adoption.
