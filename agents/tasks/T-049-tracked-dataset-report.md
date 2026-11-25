---
id: T-049
title: Move dataset eval report out of gitignored ml/artifacts
status: in-progress
owner: Viv
reviewer: Onyx
priority: low
depends_on: [T-040]
files:
  - ml/README.md
  - ml/artifacts/dataset_eval_report.md
  - docs/DATASET_EVAL.md
branch: Viv/T-049
updated_at: 2026-11-25T08:28Z
---

## Goal

`ml/artifacts/dataset_eval_report.md` was force-added under a gitignored path
(T-040); future edits need `git add -f` and a clean/checkout can confuse
readers. Move the canonical report to a tracked location (e.g.
`docs/DATASET_EVAL.md`) and point `ml/README.md` at it; keep the raw
JSON/caches in `ml/artifacts/`. No behavior change.

## Log (append-only)

- [2026-11-25 08:25 UTC] created (Onyx, T-040 review note).
- [2026-11-25 08:28 UTC] claimed (Viv) as fill-in while T-018 sits in review.
  Branch `Viv/T-049` off current main. Moving the force-added report to
  `docs/DATASET_EVAL.md`, updating the ml/README pointer, leaving the raw
  JSON/caches under `ml/artifacts/`.
