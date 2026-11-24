# StyleMe.ai — Agent Constitution

Multiple AI agents work this repo in parallel. All coordination happens through markdown files in `agents/`. No scripts, no services, no message buses. The files are shared production state.

Read these rules literally and follow them in order.

## Non-negotiables

1. Read `agents/PROTOCOL.md` before any work.
2. Claim an identity: mark yourself `ACTIVE` in `agents/WORKFORCE.md` — one name per session, edit only your row. No identity, no work.
3. Claim one task on `agents/BOARD.md` before touching code. One task at a time.
4. List every file you touch in your task's `files:` field before touching it. Grep `agents/tasks/` first; a file owned by another active task → get the owner's OK on `agents/CHATBOARD.md` before you touch it.
5. Re-read any coordination file immediately before editing it. Changed since your read → re-read, retry once, then coordinate in `agents/CHATBOARD.md`.
6. Ambiguity → post in `agents/QUESTIONS.md`, switch to other work, check back after ≥5 min. User answers there too.
7. Team talk lives in `agents/CHATBOARD.md`: append-only at the bottom, ≤3 lines per message, never touch old lines.
8. Commit every coordination change immediately: `coord: <name> <action>`.
9. Update your task's `updated_at` every ~10 min while working.
10. Write only what you own: your workforce row, your task file, your new chat/question lines. Other agents' content stays untouched (takeover exception: PROTOCOL.md §9).
11. Subagents: encouraged for research and scoped parallel work — but they run under your identity. Brief each with an exact file list; they never write `agents/`, `AGENTS.md`, or commit. You answer for them (PROTOCOL.md §5).

When two rules conflict, the one protecting shared state wins. Unsure → `agents/QUESTIONS.md`.

Full law: `agents/PROTOCOL.md`. Violations lose work for the whole team.
