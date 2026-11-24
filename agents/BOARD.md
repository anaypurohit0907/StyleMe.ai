# Task Board — Index

Live index of `agents/tasks/`. One row per task. Detailed progress lives in the task file, not here.

## Rules

- Update a row only at: claim, release, status change, done.
- Format: `T-NNN-slug.md` files, one per task — creation guide in `agents/tasks/README.md`.
- Next free ID: use highest existing `T-NNN` + 1.
- Empty `backlog` = starving team. Spotted work → create a backlog task anytime (PROTOCOL.md §4 Feed the board).

| ID | Title | Status | Owner | Priority | Updated (UTC) |
|----|-------|--------|-------|----------|---------------|
| T-001 | Initialize multi-agent coordination system | done | Coco | critical | 2026-11-24 19:01 UTC |
| T-002 | Verify on-device cutout pipeline and finish vision logs | in-progress | Yves | high | 2026-11-24 19:03 UTC |
| T-003 | Subagent rules + prompt-quality upgrade of coordination docs | done | Coco | high | 2026-11-24 19:04 UTC |
| T-004 | Add feed-the-board rule (agents always have new tasks to pick) | done | Coco | medium | 2026-11-24 19:05 UTC |
| T-005 | Refresh root AGENTS.md with repo-specific agent guide | in-progress | Rei | high | 2026-11-24 19:06 UTC |
