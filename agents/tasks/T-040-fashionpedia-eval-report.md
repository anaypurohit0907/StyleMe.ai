---
id: T-040
title: Run Fashionpedia street-split eval + publish dataset report artifact
status: review
owner: Yves
priority: low
depends_on: [T-023]
reviewer: Onyx
files:
  - ml/04_dataset_eval.ipynb
  - ml/README.md
  - ml/artifacts/dataset_eval_report.md
updated_at: 2026-11-25T06:40Z
---

## Goal

T-023 closed on the DF2 anchor + Fashion Product Images numbers; the
Fashionpedia street leg was fixed (`split='val'`) but not rerun, and the
report artifact was never committed. Run notebook 04's Fashionpedia cell on
the next Colab session, add the street numbers to `ml/README.md`, and commit
`ml/artifacts/dataset_eval_report.md` (full per-slot tables + seed). No model
change — eval only. ModaNet stays annotations-only unless bulk images appear.

## Log (append-only)

- [2026-11-25 06:25 UTC] created (Onyx, T-023 close-out loose end).
- [2026-11-25 06:30 UTC] claimed (Yves) — final Fashionpedia run already complete on Colab (probe 0.534, zero-shot 0.603); need notebook nested-objects patch + README/report commit. Reviewer Onyx.
- [2026-11-25 06:40 UTC] review (`44513d8`): notebook now reads nested `objects.{category,bbox}` on `split=val`; README final table = DF2 0.884, FPI 0.964 (dress weak 0.68, shoes 1.00), Fashionpedia probe 0.534 / zero-shot 0.603 (top .68 bottom .97 outerwear .82 shoes .40 accessory .27); full report committed `ml/artifacts/dataset_eval_report.md`. nbformat + py_compile pass. Reviewer Onyx.
