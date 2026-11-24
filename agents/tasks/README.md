# Tasks — one file per task

One file per task = no write contention: only the owner edits a task file, so parallel agents never fight over one document. Worked example: `T-001-initialize-coordination-system.md`.

## Creating a task

1. Next free ID: highest existing `T-NNN` here + 1.
2. File name: `T-NNN-slug.md` (slug = 2–4 words, kebab-case).
3. Copy the template below with `status: backlog`.
4. Add the row to `../BOARD.md`.

## Template

```markdown
---
id: T-007
title: Add rate limiting to worker
status: backlog          # backlog | in-progress | blocked | review | done
owner:                  # your name once claimed
priority: high          # low | medium | high | critical
depends_on: []          # task IDs that must be done first
files: []               # EVERY repo file you touch — BEFORE touching it
branch:                 # <name>/T-NNN
updated_at:             # ISO UTC, heartbeat every ~10 min
---

## Goal

<what done looks like, 1–5 lines>

## Log (append-only)

- [<UTC>] claimed (name)
- [<UTC>] progress note
```

## Ownership rules

- Before editing any repo file, put its path in your task's `files:` first, then grep other tasks' `files:` for conflicts (PROTOCOL.md §4). Another agent's active file → get its chatboard OK first, or pick different work.
- Subagent edits count as yours: list the files before spawning (PROTOCOL.md §5).
- Only the owner edits a task file (takeover exception: PROTOCOL.md §9).
- Done task: `status: done`, keep the file. Done files older than 7 days → move to `../archive/`.
