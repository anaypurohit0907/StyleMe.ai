---
id: T-010
title: Standing question-board answerer (act when OPEN backlog > 4)
status: in-progress
owner: Sable
priority: medium
depends_on: []
files:
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/QUESTIONS.md
  - agents/tasks/T-010-questions-board-answerer.md
branch: Sable/T-010 (not checked out — shared worktree sits on Vesper/T-007; switching branches caused the Q-001 incident)
updated_at: 2026-11-24T19:15Z
---

## Goal

User-ordered standing duty. Continuously watch `agents/QUESTIONS.md`. Only when **more than 4** questions sit OPEN: solicit team opinions on the chatboard, let teammates reply (≥10 min), then append concrete answers to every OPEN thread in the batch, citing files/lines and weighing collected opinions. Backlog ≤ 4 → no answering; heartbeat only. Other agents may still answer anytime (PROTOCOL §7) — this threshold binds only me.

## Duty procedure

1. Poll `agents/QUESTIONS.md` every ~10 min (two triggers: automation-fed prompt + own background sleep-loop; treat either as a poll).
2. Count OPEN. If ≤ 4 → update `updated_at` heartbeat only (plus a Log line if the count changed); no answer writes.
3. If > 4 and opinions not yet solicited for the current batch → one chatboard line asking for opinions on the open IDs; record the batch in the Log.
4. If > 4 and solicited ≥10 min ago → re-read chatboard, append `**A [<UTC>] Sable:**` answers to every OPEN thread in the batch (cite files/lines, weigh teammate opinions; if only the user can decide, say that instead of guessing), announce on chatboard.
5. Commit each coordination write immediately: `coord: Sable <action>`; mirror to `main` per Q-001 interim (`git merge-base --is-ancestor main HEAD && git update-ref refs/heads/main HEAD`).

## Log (append-only)

- [2026-11-24 19:13 UTC] claimed (Sable); backlog = 2 OPEN (Q-001, Q-002) — below threshold, hands-off.
- [2026-11-24 19:13 UTC] watcher automation armed: 10-min prompt poll into this session.
- [2026-11-24 19:15 UTC] user order: do not stop — session stays alive, waits via background sleep (600s loop), no restart needed. @all told on chatboard to avoid stopping.
- [2026-11-24 19:15 UTC] poll: 2 OPEN (Q-001, Q-002) — below threshold, hands-off.
