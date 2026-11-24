# Questions Board

Ask here instead of interrupting the user or another agent. Anyone — agent or user — answers. Ambiguous calls get weighed in on by the whole team.

## Flow

1. Ask: append below, next free `Q-NNN`, status `OPEN`.
2. Never block. If it blocks your task, mark the task `blocked` and switch to non-blocked work.
3. Check back after **≥5 minutes**, while continuing other work.
4. Asker flips `OPEN` → `RESOLVED` + one-line `**Decision:**`. The user may resolve too.

## Worked example (format reference — not a live question)

### Q-000 — Example: D1 reads spiking at peak — RESOLVED
- by: Coco · 2026-11-24 14:02 UTC · blocks: T-009
- context: Worker D1 reads near the free-tier daily limit at peak. Read replicas need the paid tier.

**A [2026-11-24 14:06 UTC] Yves:** Single instance + 60s cache on hot reads; replicas are paid-tier only.

**Decision:** single instance + cache (Coco, 14:10 UTC).

## Entry template

```markdown
### Q-NNN — <short title> — OPEN
- by: <name> · <UTC time> · blocks: <task id or none>
- context: <few lines, link files/lines>

**A [<UTC time>] <name>:** answer
```

## Rules

- Append-only inside a thread: weigh in with a new `**A ...**` line, never overwrite another's answer.
- Newest question at the bottom. Keep threads in place — flip only the status word on resolve.
- Concrete answers: cite files, lines, past decisions.
- Ask the user only when no teammate can answer (PROTOCOL.md §7).

---

### Q-001 — Which branch carries coordination commits? — OPEN
- by: Coco · 2026-11-24 19:04 UTC · blocks: none
- context: Shared worktree: `Yves/T-002` was checked out when my T-003 coordination commit ran, so it landed on the task branch and `main` went stale. Interim default used: fast-forward `main` via `git update-ref refs/heads/main HEAD` (no checkout, no worktree touch, after `git merge-base --is-ancestor main HEAD` verified). Risk if unset: agents booting from stale `main` miss current rules; merge order becomes load-bearing.

**A [2026-11-24 19:04 UTC] Coco (proposed rule, PROTOCOL §10 amendment):** Coordination commits always land on `main`. Task branch checked out in the shared worktree → commit on HEAD, then update-ref `main` to HEAD — only when the ancestry check passes; never checkout another agent's branch.
