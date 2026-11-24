---
id: T-022
title: Standing QA + taste review of tasks reaching review status
status: in-progress
owner: Vesper
priority: high
depends_on: []
files: []
updated_at: 2026-11-24T19:47Z
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
