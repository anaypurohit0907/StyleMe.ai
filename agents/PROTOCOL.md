# StyleMe.ai — Multi-Agent Coordination Protocol (v1)

This repo is worked in parallel by multiple AI agents. All coordination happens through markdown files in `agents/`. No message bus, no scripts, no external services — the files are shared production state. Treat them accordingly.

The human (repo owner) may edit any file at any time. Agents follow the rules below exactly.

## 1. File map

| File | Purpose | Written by |
|---|---|---|
| `agents/PROTOCOL.md` | This rulebook | Human only |
| `agents/WORKFORCE.md` | Identity registry (10 names) | Each agent edits only its own row |
| `agents/BOARD.md` | Task index (thin) | Task owner, at claim / release / done / status change |
| `agents/tasks/T-NNN-*.md` | One file per task | Task owner only |
| `agents/CHATBOARD.md` | Team chat (append-only) | All agents |
| `agents/QUESTIONS.md` | Async Q&A | All agents + user |
| `agents/archive/` | Rotated chat segments, old done tasks | Any agent during rotation |

Conventions: timestamps are UTC, human-readable form `YYYY-MM-DD HH:MM UTC`, frontmatter form ISO `2026-11-25T14:02Z`. Task IDs `T-NNN`, question IDs `Q-NNN`, zero-padded, monotonically increasing.

## 2. Boot sequence (every session)

1. Read this file end to end.
2. Claim a `FREE` name in `agents/WORKFORCE.md` (see §3). Use verify-before-write (§7).
3. Read `agents/BOARD.md` and the tail of `agents/CHATBOARD.md` and `agents/QUESTIONS.md`.
4. Claim one task (§4), create one, or answer open questions.
5. Introduce on the chatboard, one line: `- **[<UTC>] <name>:** on deck — <task id or "exploring">`.

Your name is your signature on everything. No identity → no work.

## 3. Identity rules

- One name per session. Never write as another agent.
- Claim: set your row `Status: ACTIVE`, `Since: <now UTC>`. `Task` gets set when you claim work.
- Release at session end: `Status: FREE`, `Task: —`, `Since: —`, plus a chatboard sign-off line.
- All 10 names taken → do not work; post on chatboard and wait.
- Never edit another agent's row (single exception: staleness release, §8).

## 4. Task lifecycle

Statuses: `backlog` → `in-progress` → `review` → `done`. Any state may become `blocked`.

**Claim**
1. Pick a task with `status: backlog`, all `depends_on` tasks `done`, and no owner. Or create a new task file (format in `agents/tasks/README.md`) with `status: backlog`, then claim it.
2. In the task file frontmatter: `status: in-progress`, `owner: <name>`, `branch: <name>/T-NNN`, `updated_at: <now>`.
3. Add/refresh its row in `agents/BOARD.md`.
4. One-line announce on chatboard.

**File ownership (critical)**
- Before editing any repo file, add its path to your task's `files:` frontmatter — BEFORE the first touch.
- Grep `agents/tasks/*.md` first. Path listed in another `in-progress` task → forbidden unless the owner agrees on the chatboard.
- Shared hotspots (`package.json`, lockfiles, `app.json`, `turbo.json`, tsconfig bases): announce on chatboard before touching; prefer one owner per wave.
- While working: update `updated_at` (heartbeat, §8) and append one-line entries to the task's Log.

**Done**
1. Tests, lint, and typecheck pass (per repo/subpackage AGENTS.md files).
2. Task file: `status: done`, append a one-line summary to the Log.
3. Update `agents/BOARD.md` row.
4. Announce on chatboard. Keep your name; claim next task or release.

**Blocked**
- Set `status: blocked`, note why + what unblocks it in the task file, announce, and switch to other non-blocked work. Re-check blockers periodically; unblock promptly when they clear.

## 5. Chat rules

- Append-only, bottom of file. Never edit, reorder, or delete earlier lines. Mistake → post a correcting message.
- One message ≤3 lines. Ping with `@Name`.
- Read the tail before each new task cycle. Don't re-read in a tight loop mid-edit.
- No questions (→ `QUESTIONS.md`), no claims or status moves (→ task file). Chat is coordination talk: heads-ups, handoffs, conflicts, callouts.

## 6. Questions flow

**Ask (any agent)**
1. Append a question to `agents/QUESTIONS.md` per its template — next free `Q-NNN`, status `OPEN`.
2. Never block on it. If it blocks your task, mark the task `blocked`, pick non-blocked work.
3. Check back after ≥5 minutes. Keep working meanwhile.

**Answer (any agent or the user)**
- Append an answer in the question's thread. Be concrete, cite files/lines. Conflicting answers welcome — weigh in, never overwrite.

**Resolve**
- The asker flips `OPEN` → `RESOLVED` and appends a one-line decision. The user may resolve too.
- Open question with no asker follow-up for a full day and blocking tasks: `@user` mention on the chatboard.

Never ask the user in-session for things another agent can answer. `QUESTIONS.md` is the only channel for user input.

## 7. Write safety (verify-before-write)

1. Read the target coordination file immediately before writing.
2. Make the edit. If the file changed since your read (edit mismatch / git conflict): re-read, retry once.
3. Still colliding → post on chatboard, coordinate, retry after.
4. Append-only zones: chatboard, task Logs, question threads — never restructure.
5. Single-writer zones: workforce rows, task files (owner only).
6. Repeated collision between the same two agents: the alphabetically-later name waits ~60s and retries.

## 8. Staleness & takeover

- Heartbeat: update your task's `updated_at` every ~10 min of active work.
- No update for 45 min: any agent may ping the owner on chatboard (`@Name` + task id).
- Silence 15 min after the ping: takeover allowed. Append a takeover note to the task Log, switch `owner:`, announce on chatboard. Original owner reappearing → it takes a different task; coordinate on chatboard, never edit-war.
- Name with no chat or task activity for 2h+ may be marked `FREE` by another agent (note it in the row) — only after its task was taken over per above.

## 9. Git discipline

- Commit every coordination change immediately and standalone: `coord: <name> <action>` (e.g. `coord: Nova claims T-007`). Stage only the coordination files you touched.
- Never leave coordination files dirty.
- Code work follows normal repo conventions on your branch.
- Commit fails on index lock (another agent mid-commit): wait a few seconds, retry. Never force.

## 10. Forbidden

- Editing others' chat lines, workforce rows, resolved questions, done tasks, or unowned task files (§8 exception only).
- Working without an identity or without a task claim.
- Touching a file listed in another active task without chatboard agreement.
- Blocking on the user instead of posting to `QUESTIONS.md` and switching work.
- Rewriting or deleting history in append-only zones.
- Introducing any non-md coordination mechanism (scripts, lockfiles, databases). This protocol is md-only by design.
