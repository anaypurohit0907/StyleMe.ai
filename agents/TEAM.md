# Engineering Team Charter

How this team ships. `PROTOCOL.md` is the coordination law; this file defines
the engineering roles and quality gates that sit on top of it. The human owner
has final authority. Amendments: tech lead proposes on the chatboard, human
approves, lead edits this file.

## 1. Mission

Ship a tasteful, reliable StyleMe: every change is tested, reviewed, and
worth the user's attention. Optimize for flow — small tasks, short review
queues, fast unblocks — not for looking busy.

## 2. Roles and decision rights

| Role | Who | Owns | Decides |
|---|---|---|---|
| **Tech lead** | Onyx | Triage and priority order, reviewer assignment, merge queue, architecture, unblocking | Final technical call; task reassignment; merge order; can reject a review |
| **QA + taste gate** | Vesper | Independent verification, `docs/QUALITY.md` standards, approve `review` → `done` | Code quality and user-facing taste; may block a done move |
| **Question triage** | Sable | `QUESTIONS.md`, user proxy, question backlog | Which questions need team input vs. an owner answer |
| **Domain owners** | Mobile: Marlow · Capture/vision: Yves, Wren · Worker/API: Indigo · Engine: Coco · Design/brand: Viv · Docs/coordination: Wren, Coco | Default reviewer and first responder for their area | Technical approach inside their area, subject to lead review |
| **Developers** | Everyone active | One claimed task at a time | Implementation details inside their task |

Domain ownership is a review/default-responder duty, **not** an exclusive write
lock — file ownership still follows `PROTOCOL.md` §4.

## 3. Lifecycle: Ready → Claim → Build → Review → Verify → Done

**Definition of Ready** (before a task is claimable):
- Goal and acceptance criteria are concrete and testable.
- `files:` list is real; `depends_on:` are `done`.
- Priority is honest; the task is one shippable unit.

**Definition of Done** (all must hold):
- Tests, typecheck, and lint pass per root `AGENTS.md`.
- An independent reviewer (not the author) approved the diff.
- QA/taste gate approved anything user-facing.
- Task log records the commit/branch and verification commands.
- Follow-up work surfaced by the change is on the board as backlog tasks.

No task flips itself to `done`. The reviewer/QA moves it, or the lead does
after recording the approval.

## 4. Flow limits

- **One `in-progress` task per developer.** Finish or hand off before claiming.
- **Review queue ≤ 3 tasks per reviewer.** Overload → lead reassigns.
- **Critical security/data bugs preempt feature work** (lead re-triages).
- **Blocked > 15 min → ping the lead.** Lead unblocks, reassigns, or takes the
  task over per `PROTOCOL.md` §9. Do not sit on a blocker.

## 5. Review rules

1. Reviewer is assigned at claim time in the task frontmatter (`reviewer:`);
   if unset, the lead assigns one when the task enters `review`.
2. Reviewer checks: goal met, correctness, tests actually cover the change,
   types/lint clean, security and tenant boundaries, taste rule for UI copy,
   no unrelated file churn.
3. Author responds to findings in the task log; re-review after fixes.
4. Approval is explicit: `APPROVE` or `REQUEST CHANGES` + reasons in the log.
5. **Authors never merge their own code to `main`.** The reviewer or lead
   merges after approval; the lead owns merge order.
6. Review SLA: first response within ~20 minutes of `review`, or the lead
   reassigns the review.

## 6. Async ceremonies

No meetings. The files are the ceremony:

- **Standup** = on-deck line at claim, status line at done/blocked.
- **Board pulse** = lead posts priorities, blockers, and review assignments on
  the chatboard when the board materially changes (not on a timer).
- **Incident** = immediate chatboard line + restore from git first, explain
  second (`PROTOCOL.md` §5 collision rules).
- **Retro** = recurring problems become backlog tasks with a concrete fix; no
  blame, no essay.

## 7. Branches, commits, merges

- Branch per task: `<name>/T-NNN`; keep it based on current `main`.
- Coordination commits follow `PROTOCOL.md` §10 and land on `main`.
- Before `review`: rebase/merge `main` into the task branch; resolve conflicts
  in the task branch, never in `main`.
- After approval: reviewer/lead merges to `main`, runs the CI pair once on the
  merge result, and records the merge commit in the task log.
- Never force-push `main`; never rewrite another agent's branch.

## 8. Health metrics (lead reports when useful)

- Cycle time: claim → done.
- Review latency: `review` → first response.
- WIP: in-progress tasks vs. active developers; blocked count.
- Escaped defects: bugs found after `done` (feed a backlog task each time).

Metrics are diagnostic, not a scoreboard. Fix the constraint, not the number.

## 9. Escalation ladder

1. Task owner resolves inside the task.
2. Domain owner / reviewer weighs in.
3. Tech lead decides or reassigns.
4. Human owner decides — only via `QUESTIONS.md` (or direct instruction).
