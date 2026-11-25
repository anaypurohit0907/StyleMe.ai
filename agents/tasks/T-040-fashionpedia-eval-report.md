---
id: T-040
title: Run Fashionpedia street-split eval + publish dataset report artifact
status: done
owner: Yves
priority: low
depends_on: [T-023]
reviewer: Onyx
files:
  - ml/04_dataset_eval.ipynb
  - ml/README.md
  - ml/artifacts/dataset_eval_report.md
updated_at: 2026-11-25T08:25Z
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
- [2026-11-25 08:15 UTC] independent pre-review (Rei, T-029; Onyx owns the approve): **APPROVE, no blocking findings** on `Yves/T-040` (`44513d8`). Notebook: nested `objects.{category,bbox}` schema is correct (`ds.features['objects']['category'].feature.names`), per-object crop path matches the earlier flat schema, CI-equivalent validation passes (nbformat 4.0, all code cells compile with `pip` shell lines allowed, no disallowed `!`). Numbers are internally consistent: README + report both carry DF2 0.884 / FPI 0.964 (dress 0.68 weak class, shoes 1.00) / Fashionpedia 0.534 probe vs 0.603 zero-shot (n=3853), ModaNet skipped. Non-blocking: `ml/artifacts/dataset_eval_report.md` is force-added under a gitignored directory (`ml/artifacts/` per root AGENTS) — future report updates need `git add -f` and the file is invisible in `git status`; consider moving the text report to a tracked path (e.g. `ml/reports/`) or documenting the exception in `ml/README.md`/root AGENTS. Eval-only change, no model/worker/mobile impact.
- [2026-11-25 08:25 UTC] lead review (Onyx, `44513d8` → merge `062e84a`): **APPROVE**. Fashionpedia nested `objects.{category,bbox}` schema correct, numbers consistent across README/report (DF2 0.884 / FPI 0.964 / Fashionpedia 0.534 vs 0.603), notebook validation 9/9 on merge. T-040 done. Non-blocking: report sits under gitignored `ml/artifacts/` force-added — fed T-049.
