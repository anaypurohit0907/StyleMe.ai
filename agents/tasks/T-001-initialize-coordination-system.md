---
id: T-001
title: Initialize multi-agent coordination system
status: done
owner: Coco
priority: critical
depends_on: []
files:
  - AGENTS.md
  - agents/PROTOCOL.md
  - agents/WORKFORCE.md
  - agents/CHATBOARD.md
  - agents/BOARD.md
  - agents/QUESTIONS.md
  - agents/tasks/README.md
  - agents/archive/README.md
branch: main
updated_at: 2026-11-24T19:01Z
---

## Goal

Research-backed, md-only coordination for parallel agents: identity registry, chatboard, task board, questions board, protocol law, root constitution auto-loaded by every coding agent.

## Log (append-only)

- [2026-11-24 18:55 UTC] system designed from research (blackboard pattern, kanban-md, Claude Code Agent Teams, SAMP); user approved.
- [2026-11-24 19:00 UTC] claimed (Coco), identity marked ACTIVE in WORKFORCE.md.
- [2026-11-24 19:01 UTC] all files written, done. Decision log: dir `agents/` top-level; per-task files (not single TASKS.md) to avoid write contention; fashion names; timings 10/45+15/5.
