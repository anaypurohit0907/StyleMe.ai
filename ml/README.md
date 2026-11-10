# StyleMe ML pipeline

Four Colab notebooks. Run in order. Everything is idempotent and survives session death (`.done` markers + artifacts in `STYLEME_ROOT`).

| notebook | what it does | outputs |
|---|---|---|
| `00_setup_and_download.ipynb` | downloads verified eval data (DeepFashion2 val, Fashion Product small, Fashionpedia attributes, Polyvore annotations) | `raw/` |
| `01_taxonomy_and_zero_shot.ipynb` | encodes taxonomy prompts with MobileCLIP-S1, evaluates zero-shot, exports the image tower to ONNX, writes probe training data | `prompt_embeddings.npy`, `taxonomy.json`, `mobileclip_s1_image.onnx`, `probe_data.npz`, `eval_report.*` |
| `02_probe_finetune_and_export.ipynb` | fits linear probes for attributes that failed a gate, re-bundles | `probes.json`, `styleme_vision_v1.zip` |
| `03_compatibility_abo.ipynb` | Polyvore fill-in-the-blank baseline (compatibility sanity check) | `compat_baseline.json` |

## Verified data sources

| data | source | why |
|---|---|---|
| DeepFashion2 val (32k images + bbox/category CSV) | Kaggle `jami145/deepfashion2` | real slot labels |
| Fashion Product Images (small) | Kaggle `paramaggarwal/fashion-product-images-small` | `baseColour`, `usage`, `masterCategory` labels |
| Fashionpedia clean annotations | Kaggle `tpgd01/fashionpedia-filter-attributes` | textile-pattern + silhouette attributes |
| Fashionpedia val images | HF `sandrocaseiro/fashionpedia` | image bytes for the annotation split |
| Polyvore outfit annotations | Kaggle `nguynmcch/polyvore-outfits-data` | FITB benchmark |

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
| pattern | zero-shot | not measurable* | 0.80 |
| fit | zero-shot | not measurable* | 0.75 |
| ONNX vs PyTorch parity | 20 crops | cosine **1.000** | > 0.999 ✅ |

\* Fashionpedia's public mirrors ship attributes and images with **disjoint image-id remaps**. The app keeps pattern/fit zero-shot and learns from user tag corrections; a future run can use the official train split (images + `instances_attributes_train2020.json`) to train probes.

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
