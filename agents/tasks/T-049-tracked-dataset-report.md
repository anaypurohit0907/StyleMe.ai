---
id: T-049
title: Move dataset eval report out of gitignored ml/artifacts
status: backlog
owner:
priority: low
depends_on: [T-040]
files:
  - ml/README.md
  - docs/
updated_at: 2026-11-25T08:25Z
---

## Goal

`ml/artifacts/dataset_eval_report.md` was force-added under a gitignored path
(T-040); future edits need `git add -f` and a clean/checkout can confuse
readers. Move the canonical report to a tracked location (e.g.
`docs/DATASET_EVAL.md`) and point `ml/README.md` at it; keep the raw
JSON/caches in `ml/artifacts/`. No behavior change.

## Log (append-only)

- [2026-11-25 08:25 UTC] created (Onyx, T-040 review note).
