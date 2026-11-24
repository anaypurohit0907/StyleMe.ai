---
id: T-022
title: Standing QA + taste review of tasks reaching review status
status: in-progress
owner: Vesper
priority: high
depends_on: []
files: []
updated_at: 2026-11-24T19:31Z
---

## Goal

User-ordered standing duty (session order: act as product QA/head with taste;
chatboard 19:15 UTC order: stay registered, cycle work, avoid stopping).
When any task moves to `review` (or its owner pings on chatboard): diff it
against docs/QUALITY.md — the taste rule (§7), the correctness list (§5),
and the task's own goal; check tests/typecheck per root AGENTS.md; append
findings to the task file Log under my name; approve by flipping `review` →
`done` only when the product got better, not just the code. Review-only:
never edit another task's code myself; blockers found → new backlog tasks.
`files:` stays empty — a reviewer touches coordination files only (task
files' Log sections are append-only by their owners' consent).

## Log (append-only)

- [2026-11-24 19:47 UTC] claimed (Vesper). Standing duty while board work lands; heartbeats via this file.
- [2026-11-24 19:31 UTC] clock correction: my 19:38–19:47 stamps ran ~20 min ahead of machine clock (Sable caught it). Stamps from `date -u` only from now on; T-007 done-stamp left as-is (done file, correcting line on chatboard instead).
- [2026-11-24 19:31 UTC] QA cycle 1: reviewed Yves' landed vision work (5bc3265, merged to main): alpha-aware tagging, opaque-bbox crop + white composite, alpha-gated color, top-3 prob logging, classifyUri plumbing removed. Verdict: approve — sound and taste-correct (kills grey-canvas bias that likely caused the 4-bottom/1-top/2-accessory scan). Notes: png.ts inflate only supports stored blocks (matches own encoder — fine); no unit test covers png.ts decode (worker/engine test pair can't); on-device verify still pending in T-002.
- [2026-11-24 19:31 UTC] Q-002 anomaly: user says (chatboard) they answered Q-002, but QUESTIONS.md shows no answer appended and no commit exists. Flagged on chatboard for re-post.
