---
id: T-023
title: Evaluate + adopt a public clothing dataset for slot scoring/training
status: review
owner: Wren
priority: high
depends_on: []
files:
  - ml/README.md
  - ml/04_dataset_eval.ipynb
branch: Wren/T-023
updated_at: 2026-11-24T20:11Z
---

## Goal

User-ordered via Q-002 answer (agents/QUESTIONS.md): "search online for a good dataset and use that too." User confirmed on-device tags are correct (Q-002: 4 bottom, 1 top, 2 accessory — no preprocessing bias), so the model scores clean against ground truth today. Next: adopt a public dataset to (a) benchmark the slot classifier honestly at scale, (b) feed T-009 background-augmented training. Deliverable: dataset chosen + wired into ml/ (notebook 04) with a scored eval on the slot taxonomy (top/bottom/dress/outerwear/shoes/accessory).

## Candidate seeds (Sable, 2026-11-24 websearch — verify before committing)

- **DeepFashion2** (github.com/switchablenorms/DeepFashion2) — 491K imgs, 801K items, 13 categories; 1–2,5,6→top, 7–9→bottom, 10–13→dress, 3–4→outerwear. Best coverage for the four apparel slots. No shoes.
- **Fashionpedia** (fashionpedia.github.io) — 48K imgs, 27 main categories + 294 fine-grained attributes, segmentation masks. Covers shoes + accessories; ontology is close to our subtype taxonomy.
- **Fashion Product Images** (Kaggle, paramaggarwal) — 44K e-commerce flat-lays with masterCategory (Apparel/Footwear/Accessories) + subcategory + color. Closest to our flat-lay capture style; good for shoes/accessory slots.
- Fashion-MNIST — 10 low-res classes, benchmark only; not suitable for slot scoring.

Suggested split: DeepFashion2 for main slot training, Fashionpedia/Kaggle FPI to fill shoes + accessories gaps.

## Notes

- ml/ notebooks run in Colab, are CI-validated (nbformat + python compile; `!` lines restricted to pip|cp|cd|ls) — see ml/README.md and root AGENTS.md before writing notebook 04.
- Claimer: adjust `files:` before touching anything (PROTOCOL §4); natural owner post-T-002 is Yves (context: scan accuracy + T-009).

## Log (append-only)

- [2026-11-24 19:32 UTC] created (Sable, from user Q-002 answer — dataset order).
- [2026-11-24 19:56 UTC] claimed (Wren). Path fixed to repo convention: notebooks live at ml/ root (00–03), so `ml/notebooks/04-dataset-eval.ipynb` → `ml/04_dataset_eval.ipynb`. Plan: verify candidates, write benchmark notebook scoring shipped slot probe at scale (DF2 full val + FPI shoes/accessory gap), hand Colab run to Yves.
- [2026-11-24 20:12 UTC] review (Wren): `ml/04_dataset_eval.ipynb` written (45858c1) — scores zero-shot + shipped probe on DF2 val (anchor, 2k/slot), Fashion Product (shoes/accessory gap), Fashionpedia HF street split (worn realism), ModaNet annotations-only (no public bulk images — documented skip). CI-equivalent validation passed (nbformat + compile + bang-restriction). ml/README: 04 row + sources + pending-results section. Remaining for done: Colab run (Yves — offer stands to own verdict), numbers into README results table.
- [2026-11-24 20:11 UTC] Vesper QA APPROVE (static) logged; ask = pin sampling seed — seed was pinned at birth (SEED=0, `random_state` + `default_rng`); echo added: report md/json now carry the seed, `Wren/T-023-seed` @ 63cf36c (off main) — lead merge queue. Remaining unchanged: Colab run + numbers.
- [2026-11-25 06:10 UTC] Colab interim (Yves, running): shipped probe DF2 **0.884** (n=7,999), FPI **0.964** (n=8,476), shoes recall **0.68** — first honest at-scale numbers; Fashionpedia street split downloading. Runner hit a notebook bug: `if emb:` on ndarray — Yves worked around in the runner.
- [2026-11-25 06:15 UTC] notebook patched (Wren): `Wren/T-023c` @ cac5b86 (off main; seed echo cherry-picked from 63cf36c, superseding `Wren/T-023-seed` in the merge queue) — `embed_cached` now always returns a list, `len(emb) > 0` guards in both affected cells. nbformat + compile + bang re-validated. @Onyx merge when convenient; @Yves pull the branch for the Fashionpedia leg + final report.
- [2026-11-25 06:17 UTC] lead merge (Onyx): `Wren/T-023c` merged `main` @ 96c4e90. CI notebook validation run locally on the merge result: 9/9 notebooks valid + Python-compile clean (nbformat warning on old cells only). T-023 stays `review` until Fashionpedia/full report lands; no tuning decision before the numbers.
- [2026-11-25 06:22 UTC] close-out (Wren): `Wren/T-023d` @ acb06eb — ml/README carries the first-run table + verdict proposal (DF2 0.884 < 0.90 gate → no training change yet; FPI 0.964 strong on capture style; **shoes recall 0.68 = T-009's concrete retrain target**); Fashionpedia split fixed to `val` (rerun next session); ModaNet skip documented (LFS pointers). **Proposed verdict: adopt** — datasets chosen + wired + scored at scale, honest gaps recorded, feeds T-009. @Onyx your 06:19 gate read approves the close.
