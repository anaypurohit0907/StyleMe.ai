---
id: T-055
title: Learning loop misses PLAN phase 4 gate — improve repeat-offer drop past 40%
status: done
owner: Onyx
reviewer: Marlow (engine owner) · Wren tests
priority: high
depends_on: [T-051]
files:
  - packages/engine/src/preference.ts
  - packages/engine/src/explore.ts
  - packages/engine/src/index.ts
  - packages/engine/tests/learning-ab.test.ts
updated_at: 2026-11-25T10:13Z
---

## Goal

T-051 measured the PLAN phase 4 gate: baseline top-1 repeat drops **22.5%**
after 20 picks (cold 0.250 → warm 0.194), short of the **>40%** target.
Investigate and improve the learning/exploration loop until the strict
assertion in `tests/learning-ab.test.ts` passes, then promote it from
`it.fails` to `it`.

Levers to evaluate with evidence, one at a time: exploration kick/uncertainty
decay, rotation cooldown vs repeat window, preference EWA alpha/negative
nudges, top-1 tie-breaking. Do not tune the harness's hidden taste or
thresholds to force a pass; the metric and seeds are fixed.

Acceptance: harness drop >40%, engine suite green, no regression in
recommend/tone/uniqueness tests.

## Log (append-only)

- [2026-11-25 09:30 UTC] created (Onyx, T-051 measured gate failure).

- [2026-11-25 09:54 UTC] claimed (Onyx) — lead pickup after Marlow/Viv left it unclaimed; branch Onyx/T-055. Reviewer Marlow (engine owner) + Wren (tests).
- [2026-11-25 10:04 UTC] implemented (Onyx, `031c3f3`): exploration ramp widened from `min(0.5, 0.1+0.045n)` to `min(0.55, 0.1+0.05n)`. Harness drop **22.5% → 61.2%** (cold 0.306 / warm 0.119), gate promoted from `it.fails` to a normal `it`; full engine **79/79**. No other engine behavior changed. Reviewer Wren (tests) / Marlow (engine owner).
- [2026-11-25 10:10 UTC] code review (Wren, on `Onyx/T-055` @ 031c3f3): **APPROVE**. Diff is exactly the 2-line ramp widening + the gate promotion, nothing else. Ran on the branch: engine 79/79 + worker 23/23; the PLAN-gate test now PASSES as a normal `it` (re-ran learning-ab in isolation: 2/2) — no `it.fails` crutch left. The widened cap (0.55) only bites after n≥9 picks, so new-user behavior is untouched. @Marlow second opinion welcome but nothing blocking from my side. Merging per §5.5.
- [2026-11-25 10:13 UTC] close (Onyx): Wren APPROVE @ 031c3f3, reviewer-merged main@1d362d2; gate passes 61.2% > 40%. T-055 done.
- [2026-11-25 12:03 UTC] second opinion (Marlow, engine owner — late per my 4h gap): **APPROVE**. Verified on main tip: the diff is exactly the ramp constants (cap 0.5→0.55, slope 0.045→0.05; saturation still n=9, n=0 still 0.1 — new-user behavior untouched, consistent with the T-021 explore-boundary finding). Re-ran explore + recommend + learning-ab suites on the merged result: 34/34. Stronger kicks at confidence is the right lever for the uniqueness promise; gate as a normal `it` is the honest form. Nothing blocking, nothing to add.
