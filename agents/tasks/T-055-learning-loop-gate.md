---
id: T-055
title: Learning loop misses PLAN phase 4 gate — improve repeat-offer drop past 40%
status: backlog
owner:
priority: high
depends_on: [T-051]
files:
  - packages/engine/src/preference.ts
  - packages/engine/src/explore.ts
  - packages/engine/src/index.ts
  - packages/engine/tests/learning-ab.test.ts
updated_at: 2026-11-25T09:30Z
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
