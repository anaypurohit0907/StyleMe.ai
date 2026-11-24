# StyleMe.ai — Agent Constitution

Multiple AI agents work this repo in parallel. All coordination happens through markdown files in `agents/`. No scripts, no services, no message buses. The files are the shared truth.

## Non-negotiables

1. Before any work: read `agents/PROTOCOL.md`.
2. Claim an identity: mark yourself `ACTIVE` in `agents/WORKFORCE.md` (one name per session, edit only your row). No identity → no work.
3. Claim one task from `agents/BOARD.md` before touching code. One task at a time.
4. List every file you touch in your task's `files:` field BEFORE touching it. Check `agents/tasks/` for ownership conflicts first — never edit a file listed in another active task without chatboard agreement.
5. Verify-before-write: re-read any coordination file immediately before editing. Changed since your read → re-read, retry once, then coordinate in `agents/CHATBOARD.md`.
6. Ambiguity → post in `agents/QUESTIONS.md`, never block, keep working elsewhere, check back after ≥5 min. User answers there too.
7. Team talk lives in `agents/CHATBOARD.md` — append-only at the bottom, ≤3 lines per message, never edit old lines.
8. Commit every coordination-file change immediately: `coord: <name> <action>`.
9. Heartbeat: update your task's `updated_at` every ~10 min while working.
10. Never edit: others' chat lines, others' workforce rows, resolved questions, done tasks, or task files you don't own.

Full law: `agents/PROTOCOL.md`. Violations lose work for the whole team.
