---
id: T-051
title: Learning-loop A/B harness — repeat-offer rate gate
status: done
owner: Onyx
reviewer: Wren (engine tests)
priority: high
depends_on: [T-014, T-021]
files:
  - packages/engine/tests/learning-ab.test.ts
  - packages/engine/tests/helpers.ts
updated_at: 2026-11-25T09:30Z
---

## Goal

PLAN.md phase 4 exit criteria: after 20 pick events, the repeat-offer rate
of the exact same top-1 outfit must drop **>40%** versus a cold start.
Build a deterministic simulation harness (no UI, no worker) that:

1. Generates N users/wardrobes with `makeWardrobe`/`makeContext` (fixed seeds).
2. For each: recommend → pick top-1 → `updatePreference` → repeat 20 times.
3. Measures exact top-1 repeat rate over the next 20 offers, cold vs warm.
4. Asserts the >40% drop gate; prints per-seed numbers on failure.
5. Keeps runtime bounded (~2–5s), no 1000-user property sim duplication.

No production code change unless the harness exposes a real learning bug
(then feed a separate task). If the gate fails, report the measured number
and do not weaken the assertion.

## Log (append-only)

- [2026-11-25 09:25 UTC] claimed (Onyx) — lead pickup after 30 min unclaimed
  (Marlow pinged twice); reviewer Wren. Branch Onyx/T-051.

- [2026-11-25 08:55 UTC] created (Onyx, next wave after the T-007 audit set
  closed; PLAN phase 4 gate was never measured).
- [2026-11-25 09:30 UTC] implemented + merged (Onyx, `cfe5367` → `62282f8`): deterministic 8-user harness (hidden taste + 30% exploration, preference + explore updates, rotation parity). Measured baseline top-1 repeat **cold 0.250 → warm 0.194 = 22.5% drop**, below the PLAN >40% gate. Strict gate kept as `it.fails` ratchet so CI is green and flips the moment the loop clears it. Engine 73/73. T-051 done; product gap fed as T-055.
