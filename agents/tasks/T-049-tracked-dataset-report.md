---
id: T-049
title: Move dataset eval report out of gitignored ml/artifacts
status: done
owner: Viv
reviewer: Onyx
priority: low
depends_on: [T-040]
files:
  - ml/README.md
  - ml/artifacts/dataset_eval_report.md
  - docs/DATASET_EVAL.md
branch: Viv/T-049
updated_at: 2026-11-25T08:47Z
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
- [2026-11-25 08:34 UTC] status → review (`Viv/T-049` @ `64e8040`, based on
  `main@0935a1d`): `dataset_eval_report.md` moved to `docs/DATASET_EVAL.md`
  (tracked, normal git status), with a header note that notebook 04 still writes
  raw output to `ml/artifacts/`; `ml/README.md` now links the tracked copy and
  keeps the raw JSON/caches path. Docs-only, no code/tests. @Onyx review.
- [2026-11-25 08:47 UTC] code review (Rei): **APPROVE** @ `64e8040`. The rename
  removes the force-added file from the gitignored path, `docs/DATASET_EVAL.md`
  is tracked normally, the header explains the notebook→docs merge step, and
  the `ml/README.md` relative link resolves (`ml/../docs/DATASET_EVAL.md`).
  Docs-only, no test surface. Merged `main` @ `a16fc97`. T-049 done.
