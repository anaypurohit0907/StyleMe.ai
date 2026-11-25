# StyleMe ML pipeline

Four Colab notebooks. Run in order. Everything is idempotent and survives session death (`.done` markers + artifacts in `STYLEME_ROOT`).

| notebook | what it does | outputs |
|---|---|---|
| `00_setup_and_download.ipynb` | downloads verified eval data (DeepFashion2 val, Fashion Product small, Fashionpedia attributes, Polyvore annotations) | `raw/` |
| `01_taxonomy_and_zero_shot.ipynb` | encodes taxonomy prompts with MobileCLIP-S1, evaluates zero-shot, exports the image tower to ONNX, writes probe training data | `prompt_embeddings.npy`, `taxonomy.json`, `mobileclip_s1_image.onnx`, `probe_data.npz`, `eval_report.*` |
| `02_probe_finetune_and_export.ipynb` | fits linear probes for attributes that failed a gate, re-bundles | `probes.json`, `styleme_vision_v1.zip` |
| `03_compatibility_abo.ipynb` | Polyvore fill-in-the-blank baseline (compatibility sanity check) | `compat_baseline.json` |
| `04_dataset_eval.ipynb` | benchmarks the shipped slot head at scale on public sets: DeepFashion2 val (anchor), Fashion Product (shoes/accessory), Fashionpedia street (worn realism), ModaNet (annotations only — no public bulk images) | `dataset_eval_report.md/json` |

## Verified data sources

| data | source | why |
|---|---|---|
| DeepFashion2 val (32k images + bbox/category CSV) | Kaggle `jami145/deepfashion2` | real slot labels |
| Fashion Product Images (small) | Kaggle `paramaggarwal/fashion-product-images-small` | `baseColour`, `usage`, `masterCategory` labels |
| Fashionpedia clean annotations | Kaggle `tpgd01/fashionpedia-filter-attributes` | textile-pattern + silhouette attributes |
| Fashionpedia val images | HF `sandrocaseiro/fashionpedia` | image bytes for the annotation split |
| Polyvore outfit annotations | Kaggle `nguynmcch/polyvore-outfits-data` | FITB benchmark |
| ModaNet annotations | GitHub `eBay/modanet` (git-lfs) | street-photo slot labels for T-009 augmentation; images not publicly scriptable — eval skipped, see notebook 04 |
| Fashionpedia images (HF) | HF `detection-datasets/fashionpedia` | street-photo slot benchmark split (worn garments) |

## Dataset slot benchmark (notebook 04 — T-023)

Scores the shipped slot head (zero-shot + `probes.json` probe) on public corpora against our
6-slot taxonomy. Gate: probe ≥ 0.90 on the DeepFashion2 anchor; street sets measure
worn-vs-flat distribution shift, not the gate. Sampling seed pinned (SEED=0) so numbers stay
comparable across T-009 retrains. All four corpora are non-commercial-licensed:
fine for eval/training research (T-009), re-review before commercial use. They supplement —
never replace — the 20–30 real labeled phone photos T-009 needs; no public set contains our
bed/floor phone flat-lays.

First Colab run (Yves, 2026-11-25, shipped probe):

| dataset | style | probe acc | n | notes |
|---|---|---|---|---|
| DeepFashion2 val | consumer photos (anchor) | **0.884** | 7,999 | below the 0.90 gate — no training change shipped on it, but the honest baseline for T-009 |
| Fashion Product Images | e-commerce flat-lays | **0.964** | 8,476 | strong on our capture style; **shoes recall 0.68** — the measured gap T-009's background-invariant retrain targets |
| Fashionpedia (HF) | street (worn) | pending | — | split name fixed (`val` not `validation`); rerun with the next Colab session |
| ModaNet | street (worn) | skipped | — | repo clone yields git-lfs pointers, no bulk images — annotations remain T-009 augmentation labels |

Verdict (T-023, lead-approved gate read): the shipped slot head holds flat-lay/e-commerce
territory (FPI 0.964) and sits just under the anchor gate on DF2 (0.884); the one measured
weakness is **shoes recall 0.68**, which becomes the concrete target for T-009's
background-augmented retrain + more shoes training data. Full report lands in
`artifacts/dataset_eval_report.md` on the next run.

## Results (MobileCLIP-S1, 256px, 512-d)

| attribute | method | accuracy | gate |
|---|---|---|---|
| slot | zero-shot | 0.584 | 0.90 |
| slot | **linear probe** (DF2 + Fashion Product) | **0.930** | 0.90 ✅ |
| color | zero-shot | 0.596 | — |
| color | classical CV (studio product set) | 0.266 | 0.85 |
| color | classical CV (center median, solid palette) | **16/16 synthetic** | — |
| color | linear probe (diagnostic) | 0.642 | 0.85 |
| formality | zero-shot | 0.100 exact / 0.499 ±1 | 0.70 |
| formality | **linear probe** (3 coarse bands) | **0.942** | 0.70 ✅ |
| pattern | zero-shot / editable default | no signal found | 0.80 |
| fit | zero-shot / editable default | no signal found | 0.75 |
| ONNX vs PyTorch parity | 20 crops | cosine **1.000** | > 0.999 ✅ |

Pattern/fit probes were trained on Fashionpedia `train2020` (`ml/train_pattern_fit_probe.py`), but MobileCLIP-S1 embeddings carry no usable signal for these fine attributes: balanced accuracy was ~random (0.24/0.25) and the model predicted solid/regular for nearly everything. They are **not shipped**; the tag editor defaults to solid/regular and user corrections remain the flywheel. A fashion-specific encoder is the next lever.

### Runtime decision

- **TFLite was rejected.** `onnx2tf` produced a model with cosine **-0.12** vs PyTorch; int8 dynamic quantization scored **0.11**. FastViT is too sensitive for those paths without calibration.
- **Ship fp32 ONNX** (88.7 MB) with `onnxruntime-react-native`. Parity is exact. Static int8 with a calibration set is the later optimization.
- **Color uses classical CV, not a probe.** Center-crop median RGB → nearest palette anchor. Perfect on solid colors; robust on garment close-ups. The color probe stays in `probes.json` only as a diagnostic.
- The app applies probes as `argmax(W·e + b)` in TypeScript — no extra runtime.

## Bundle contents

`styleme_vision_v1.zip`:

```
prompt_embeddings.npy      # 44 x 512 prompt vectors
taxonomy.json              # prompt order + model metadata
mobileclip_s1_image.onnx   # image tower, fp32, input [1,3,256,256]
probes.json                # slot / color / formality linear heads
probe_data.npz             # training data for the next probe version
eval_report.md / .json
visual_grid_slots.png
```

Copy into the app build (see `apps/mobile/src/vision/README.md`).

## Colab CLI notes

- The CLI executes notebooks headless; `drive.mount` is skipped when `STYLEME_ROOT` is set.
- Set `KAGGLE_API_TOKEN` in the kernel (preamble) before running 00.
- Artifacts live in `/content/StyleMe` on the CLI runtime (ephemeral). Pull them out with `scp` through the CLI's SSH proxy before stopping the session.

## Subtype classifier (shipped)

Frozen MobileCLIP embeddings had no subtype signal (0.149 / 0.285). A small **MobileNetV3-Small** fine-tuned on Fashionpedia train2020 crops works:

| model | task | accuracy |
|---|---|---|
| MobileNetV3-Small | 8 subtypes (shirt, t-shirt, sweater, tank, trousers, shorts, skirt, dress) | **0.690** |

Shipped as `subtype_mobilenet.onnx` (6MB) with a confidence gate (0.6). Confident subtypes nudge formality (t-shirt/shorts → casual; shirt/trousers → formal) and feed the engine's occasion rule. Training script: `ml/experiments/train_subtype_mobilenet.py`.
