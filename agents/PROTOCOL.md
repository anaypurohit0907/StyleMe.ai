# StyleMe.ai — Multi-Agent Coordination Protocol (v1.1)

This repo is worked in parallel by multiple AI agents. All coordination happens through markdown files in `agents/`. No message bus, no scripts, no external services — the files are shared production state. Treat them accordingly.

Read these rules literally and execute them in order. When two rules conflict, the one protecting shared state wins. Still unsure → `QUESTIONS.md`.

The human (repo owner) may edit any file at any time. Agents follow the rules below exactly.

## 1. File map

| File | Purpose | Written by |
|---|---|---|
| `agents/PROTOCOL.md` | This rulebook | Human only |
| `agents/WORKFORCE.md` | Identity registry (10 names) | Each agent edits only its own row |
| `agents/BOARD.md` | Task index (thin) | Task owner, at claim / release / done / status change |
| `agents/tasks/T-NNN-*.md` | One file per task | Task owner only |
| `agents/CHATBOARD.md` | Team chat (append-only) | Registered identities only |
| `agents/QUESTIONS.md` | Async Q&A | Registered identities + user |
| `agents/archive/` | Rotated chat segments, old done tasks | Any agent during rotation |

Conventions: timestamps are UTC — human form `YYYY-MM-DD HH:MM UTC`, frontmatter form ISO `2026-11-24T19:00Z`. IDs: tasks `T-NNN`, questions `Q-NNN`, zero-padded, monotonically increasing.

## 2. Boot sequence (every registered session)

1. Read this file end to end.
2. Claim a `FREE` name in `agents/WORKFORCE.md` (§3), verify-before-write (§8).
3. Read `agents/BOARD.md`, the tail of `agents/CHATBOARD.md`, and `agents/QUESTIONS.md`.
4. Claim one task (§4), create one, or answer open questions.
5. Introduce on the chatboard, one line: `- **[<UTC>] <name>:** on deck — <task id or "exploring">`.

You are a registered top-level session — subagents are not; they work under a registered name (§5). Your name is your signature on everything. No identity → no work.

## 3. Identity rules

- One name per session. Never write as another agent.
- Claim: set your row `Status: ACTIVE`, `Since: <now UTC>`. `Task` fills in when you claim work.
- Release at session end: `Status: FREE`, `Task: —`, `Since: —`, clear `Notes`, plus a chatboard sign-off line.
- All 10 names taken → post on chatboard and wait; pick up work when a name frees.
- Edit another agent's row only for staleness release (§9).

## 4. Task lifecycle

Statuses: `backlog` → `in-progress` → `review` → `done`. Any state may become `blocked`.

**Claim**
1. Pick a task with `status: backlog`, all `depends_on` tasks `done`, and no owner. Or create one (format: `agents/tasks/README.md`; worked example: `T-001`), then claim it.
2. In the task file frontmatter: `status: in-progress`, `owner: <name>`, `branch: <name>/T-NNN`, `updated_at: <now>`.
3. Add/refresh its row in `agents/BOARD.md`.
4. One-line announce on chatboard.

**Feed the board**
- Spotted work worth doing — bug, follow-up, debt, improvement — → create a backlog task file right away (`status: backlog`, no owner) plus its `agents/BOARD.md` row. Do this even mid-task: 30 seconds that keeps idle teammates fed.
- Empty backlog = team stalls. Never let it starve while you know of real work.
- One task = one shippable unit, honest `priority:`, real `depends_on:`. Skip maybes — junk backlog wastes claims.

**File ownership (critical)**
- Before editing any repo file, add its path to your task's `files:` frontmatter — before the first touch. Applies to subagent edits too (§5).
- Grep `agents/tasks/*.md` first. Path owned by another `in-progress` task → get the owner's OK on the chatboard before touching it.
- Shared hotspots (`package.json`, lockfiles, `app.json`, `turbo.json`, tsconfig bases): announce on chatboard before touching; prefer one owner per wave.
- While working: update `updated_at` (heartbeat, §9) and append one-line entries to the task's Log.

**Done**
1. Tests, lint, and typecheck pass (per repo/subpackage AGENTS.md files).
2. Task file: `status: done`, append a one-line summary to the Log.
3. Update the `agents/BOARD.md` row.
4. Write backlog tasks for the follow-ups this work surfaced (Feed the board).
5. Announce on chatboard. Keep your name; claim next task or release.

**Blocked**
- Set `status: blocked`, note why + what unblocks it, announce, and switch to other non-blocked work. Re-check blockers periodically; unblock promptly when they clear.

## 5. Subagents

Delegate freely. Subagents (fresh-context child sessions) keep your context clean and multiply throughput: use them for research, codebase sweeps, test runs, and scoped parallel edits — inside these rails.

**Identity.** A subagent runs under your name. It never claims a workforce name, never writes `agents/` or `AGENTS.md`, never posts chat or questions, and never runs `git commit` — you relay its findings and commit its results. You answer for every file it writes.

**Before spawning:**
1. Add every file the subagent may touch to your task's `files:` list, and check ownership across `agents/tasks/` exactly as for your own edits (§4).
2. Write a self-contained brief — a subagent sees only its brief and the repo's AGENTS.md files, nothing from your session. Include: goal, exact allowed-file list, the conventions that matter, expected return format, plus this line verbatim: `You are a subagent: write only the listed files; do not edit agents/ or AGENTS.md; do not run git commit.`
3. Spawning several in parallel → give each a disjoint file list, stated in every brief.

**After spawn:**
- Prefer read-only (explore-style) subagents for research; use write-capable ones only inside your claimed files.
- Review the subagent's diff before committing — it cannot see changes other agents made since your last read.
- Relay what the team should know: one chatboard line under your name.

**On collision.** A subagent overwrote another agent's work → stop, announce on chatboard immediately, restore from git, re-claim the file per §4. Report and repair fast; hiding it compounds the damage.

## 6. Chat rules

- Append-only at the bottom. Never edit, reorder, or delete earlier lines — post a correcting line instead.
- One message ≤3 lines. Ping with `@Name`.
- Read the tail before each new task cycle; skip re-reading in a tight loop mid-edit.
- Chat carries: on-deck lines, claims, blocked/done moves, heads-ups on shared files, takeovers, callouts. Questions → `QUESTIONS.md`; claims/status → task files.

## 7. Questions flow

**Ask (any agent)**
1. Append the question to `agents/QUESTIONS.md` per its template — next free `Q-NNN`, status `OPEN`. Worked example in that file.
2. Never block on it. If it blocks your task, mark the task `blocked` and pick non-blocked work.
3. Check back after ≥5 minutes, while continuing other work meanwhile.

**Answer (any agent or the user)**
- Append an answer in the question's thread: concrete, citing files/lines. Conflicting answers welcome — weigh in with a new `**A ...**` line, never overwrite another's answer.

**Resolve**
- The asker flips `OPEN` → `RESOLVED` and appends a one-line `**Decision:**`. The user may resolve too.
- Open question, blocking tasks, no asker follow-up for a day → `@user` mention on the chatboard.

Never ask the user in-session for what another agent can answer. `QUESTIONS.md` is the only user-input channel.

## 8. Write safety (verify-before-write)

1. Read the target coordination file immediately before writing.
2. Edit. File changed since your read (edit mismatch / git conflict) → re-read, retry once.
3. Still colliding → post on chatboard, coordinate, retry after.
4. Append-only zones: chatboard, task Logs, question threads — restructure nothing.
5. Single-writer zones: workforce rows, task files (owner only).
6. Same two agents colliding repeatedly → the alphabetically-later name waits ~60s and retries.

## 9. Staleness & takeover

- Heartbeat: update your task's `updated_at` every ~10 min of active work.
- No update for 45 min: any agent may ping the owner on chatboard (`@Name` + task id).
- Silence 15 min after the ping: takeover allowed. Append a takeover note to the task Log, switch `owner:`, announce on chatboard. The original owner, on return, takes a different task — coordinate on chatboard, never edit-war.
- Name with no chat or task activity for 2h+ may be marked `FREE` by another agent (note it in the row) — only after its task was taken over per above.

## 10. Git discipline

- Commit every coordination change immediately and standalone: `coord: <name> <action>` (e.g. `coord: Nova claims T-007`). Stage only the coordination files you touched.
- Leave no coordination file dirty.
- Code work follows normal repo conventions on your branch.
- Commit fails on index lock (another agent mid-commit): wait a few seconds, retry. Never force.

## 11. Boundaries

| Never | Instead |
|---|---|
| Edit another agent's chat line, workforce row, resolved question, done task, or unowned task file | Post a new line under your own name; take over only via §9 |
| Work without an identity or an unclaimed task | Run boot (§2), then claim (§4) |
| Touch a file owned by another active task | Choose other work; if unavoidable, get the owner's chatboard OK first |
| Wait on the user while blocked | Post `QUESTIONS.md`, mark the task `blocked`, switch work |
| Rewrite or delete history in an append-only zone | Append a correcting line |
| Add non-md coordination machinery (scripts, lockfiles, services) | Work the protocol as written |
