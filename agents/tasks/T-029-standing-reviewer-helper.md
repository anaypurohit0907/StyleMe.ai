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
updated_at: 2026-11-26T07:22Z
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
- [2026-11-25 05:40 UTC] session resumed after machine-sleep gap. Sweep:
  released stale Marlow + Viv rows per §9; pinged Indigo (T-020 resumed
  05:36, no takeover needed) and surfaced Q-005 (Onyx resumed 05:37).
  Reviewed + merged T-033 `Wren/T-033` @ 9c9b19a → `main` a1860a2
  (CI pair 52+8, tsc ×4 green); Onyx recorded the post-merge APPROVE.
- [2026-11-26 07:22 UTC] on deck after pause (T-029 heartbeat). Overnight
  review record: T-044 SQL wear-history APPROVE + merge; T-008/T-020/T-040/
  T-049/T-050/T-054/T-059 pre-reviews; T-035 devDeps finding; T-014 sync-queue
  lost-update race caught; T-062 render-loop caught from the focus-effect
  dependency chain, then hotfix + conditional-BlurView reviews — crash clear,
  final APK `9b87bcd1…` verified on the phone (pid alive, clean logcat), vision
  pass done. T-046 emulator marked **blocked** with evidence and docs corrected.
  Product proposal landed: `agents/proposals/Rei.md` (evidence-based APPROVE +
  `apk-latest` cold-launch gate). Standing by for review overflow and the
  execution-plan meeting sections.
