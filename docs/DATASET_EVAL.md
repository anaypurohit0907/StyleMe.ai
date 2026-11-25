# StyleMe — dataset slot benchmark (notebook 04)

> Tracked canonical report. Notebook 04 writes raw outputs to
> `ml/artifacts/dataset_eval_report.{md,json}`; merge reviewed numbers here.

| dataset | model | acc | n | per-slot recall |
|---|---|---|---|---|
| deepfashion2 | zero-shot | 0.566 | 7999 | top 0.81, bottom 0.22, dress 0.73, outerwear 0.51 |
| deepfashion2 | probe | 0.884 | 7999 | top 0.84, bottom 0.93, dress 0.86, outerwear 0.91 |
| fashion_product | zero-shot | 0.766 | 8476 | top 0.80, bottom 0.39, dress 0.96, shoes 0.91, accessory 0.91 |
| fashion_product | probe | 0.964 | 8476 | top 0.98, bottom 0.96, dress 0.68, shoes 1.00, accessory 0.99 |
| fashionpedia | zero-shot | 0.603 | 3853 | top 0.72, bottom 0.36, outerwear 0.66, shoes 0.69, accessory 0.52 |
| fashionpedia | probe | 0.534 | 3853 | top 0.68, bottom 0.97, outerwear 0.82, shoes 0.40, accessory 0.27 |

Skipped: modanet

Gate: probe >= 0.90 on the DeepFashion2 anchor (matches ml/README results table).
Street sets (Fashionpedia/ModaNet) measure distribution shift, not the gate.
Sampling seed pinned at 0 — numbers stay comparable across T-009 retrains.
All corpora non-commercial licensed — eval/research use only.