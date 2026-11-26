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
  - agents/proposals/Sable.md
  - agents/tasks/T-010-questions-board-answerer.md
branch: Sable/T-010 (not checked out — shared worktree sits on Vesper/T-007; switching branches caused the Q-001 incident)
updated_at: 2026-11-26T06:42Z
---

## Goal

User-ordered standing duty. Continuously watch `agents/QUESTIONS.md`. Only when **more than 4** questions sit OPEN: solicit team opinions on the chatboard, let teammates reply (≥10 min), then append concrete answers to every OPEN thread in the batch, citing files/lines and weighing collected opinions. Backlog ≤ 4 → no answering; heartbeat only. Other agents may still answer anytime (PROTOCOL §7) — this threshold binds only me.

## Duty procedure

1. Poll `agents/QUESTIONS.md` every ~10 min (two triggers: automation-fed prompt + own background sleep-loop; treat either as a poll).
2. Count OPEN with `grep -E '^### Q-[0-9]{3}.*— OPEN' agents/QUESTIONS.md` (template header `Q-NNN` must not count). If ≤ 4 → update `updated_at` heartbeat only (plus a Log line if the count changed); no answer writes.
3. If > 4 and opinions not yet solicited for the current batch → one chatboard line asking for opinions on the open IDs; record the batch in the Log.
4. If > 4 and solicited ≥10 min ago → re-read chatboard, append `**A [<UTC>] Sable:**` answers to every OPEN thread in the batch (cite files/lines, weigh teammate opinions; if only the user can decide, say that instead of guessing), announce on chatboard.
5. Commit each coordination write immediately: `coord: Sable <action>`; mirror to `main` per Q-001 interim **only if `git log main..HEAD` is coordination-only** (charter `TEAM.md` §7: code merges belong to reviewer/lead — never update-ref teammates' unreviewed task commits into `main`; if my coord commit strands behind code, flag @Onyx for merge order).

## Log (append-only)

- [2026-11-24 19:13 UTC] claimed (Sable); backlog = 2 OPEN (Q-001, Q-002) — below threshold, hands-off.
- [2026-11-24 19:13 UTC] watcher automation armed: 10-min prompt poll into this session.
- [2026-11-24 19:15 UTC] user order: do not stop — session stays alive, waits via background sleep (600s loop), no restart needed. @all told on chatboard to avoid stopping.
- [2026-11-24 19:15 UTC] poll: 2 OPEN (Q-001, Q-002) — below threshold, hands-off.
- [2026-11-24 19:32 UTC] poll: 2 OPEN. User answered Q-002 in-thread (tags confirmed correct) — relayed on chatboard, nudged @Yves to resolve. Fed board: T-023 (dataset eval, user-ordered). Vesper clock callout acknowledged + fixed.
- [2026-11-24 19:56 UTC] poll: 3 OPEN (Q-003 new — worn vs flat photos, blocks T-002). Below threshold, hands-off. Logging todo was already fed as T-024 by Indigo. Incident: own 19:52 chat edit mangled L61 — repaired verbatim + correcting line posted.
- [2026-11-24 19:57 UTC] charter absorbed (TEAM.md §2, PROTOCOL v1.2 §12): role formalized — question triage + user proxy. T-010 = non-code standing duty, reviewer N/A per §12 ("every code task"). Mirror policy tightened: coordination-only diffs, else flag lead.
- [2026-11-24 19:58 UTC] main diverged + ahead (f1230b7 — Yves T-002/T-008 merged, coordination unions). My c86235e stranded on Wren/T-023; ancestry check correctly blocked mirror. Flagged @Onyx — merge order is lead's; polling continues.
- [2026-11-24 20:02 UTC] poll: 3 OPEN (a 4th grep hit was the Q-NNN template line — counting fixed in procedure §2). Onyx confirmed mirror rule + took my T-010 to main (19:57Z there). Standing arrangement: coord commits land on HEAD, lead's merge queue reconciles.
- [2026-11-24 20:08 UTC] process change absorbed (Onyx 20:05): shared worktree on `main` — coord commits land directly on main, no update-ref mirror. Stranded Wren/T-023 commits preserved for lead. Poll: 3 OPEN, hands-off.
- [2026-11-24 20:12 UTC] poll: 2 OPEN — user answered all three via Indigo (Q-001 RESOLVED: task branches + lead merge; Q-002: current grid = truth; Q-003: flat-lay on purpose, pipeline at fault). Q-002/Q-003 stay OPEN for Yves' flip at scoring. T-008 prioritized per user.
- [2026-11-24 20:18 UTC] poll: 0 OPEN — full board resolved (Q-004 migration Q opened+resolved by Indigo same cycle; Yves logged Q-002/Q-003 decisions). Watch continues; threshold never crossed today.
- [2026-11-25 02:49 UTC] poll: 0 OPEN — poll gap 21:12→02:49 (automation delivered late); board quiet since 21:15, all sessions silent 5h+. Watch continues; no staleness wake-ups posted (lead's call).
- [2026-11-25 02:52 UTC] poll: 1 OPEN — Q-005 (Vesper escalation to @user: lead absent 6h+, gates-green tasks unmergeable; options: confirm Onyx / acting lead / one-time merge authority). Below threshold, hands-off — user decision question, other agents active.
- [2026-11-25 05:02 UTC] poll: 1 OPEN (Q-005 unchanged) — server restart killed sleep + 2h gap; automation fired. Team waking: Coco/Wren active on reviews. Watch continues.
- [2026-11-25 05:42 UTC] poll: 0 OPEN — Q-005 RESOLVED (Onyx back 05:37, confirmed lead per Anay; gap merges ratified). Full velocity: T-011/T-033 merged, T-036 fed+claimed (T-024 log regression), T-021/T-028/T-032 active. Nothing needs Anay from my corner.
- [2026-11-25 18:51 UTC] poll: 0 OPEN — board green all day; 40+ tasks merged since 05:42 (full audit set + wave 2 + glass pass in flight). T-062 crash incident contained (hotfix 8d10820, apk-latest rolled back, one-phone-one-owner adopted). Anay overnight orders: ALL-agents product review → PROPOSALS ONLY; sleep-wait discipline (my standing mode); phone window = Marlow. I'll contribute the user-proxy angle once the team sets the format.
