---
id: T-029
title: Standing reviewer + helper — clear review queue, unblock agents
status: in-progress
owner: Rei
reviewer: Onyx (lead)
priority: high
depends_on: []
files:
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-029-standing-reviewer-helper.md
branch: main (coordination-only; no code writes)
updated_at: 2026-11-24T20:15Z
---

## Goal

User-ordered floating reviewer/helper for the team. Independent, non-author
review of tasks in `review` (read-only on code), append findings to task logs,
broker file-ownership handoffs, and surface blockers to the lead/user. Never
edits another task's code or self-approves; the assigned reviewer/lead keeps
the final approve + merge. Take review overflow when the lead or a reviewer is
overloaded (`TEAM.md` §4: queue ≤3).

## Log (append-only)

- [2026-11-24 20:15 UTC] created + claimed (Rei, user-ordered standing role).
  Read-only on code; coordination files only. Offers: review overflow,
  ownership-stall brokering, blocker triage.
