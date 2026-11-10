# On-device vision

The app ships the bundle produced by `ml/01_taxonomy_and_zero_shot.ipynb` + `02_probe_finetune_and_export.ipynb`:

```
assets/vision/
  mobileclip_s1_image.onnx    # image tower, fp32, input [1,3,256,256] CHW
  prompt_embeddings.npy       # 44 x 512 prompt vectors
  taxonomy.json               # prompt order + model metadata
  probes.json                 # slot / color / formality linear heads
```

**Runtime:** `onnxruntime-react-native` (dev build / EAS, not Expo Go).

TFLite was evaluated and rejected: `onnx2tf` and int8 dynamic quantization both broke parity on FastViT (cosine -0.12 / 0.11). fp32 ONNX parity is 1.000.

## Wiring

```bash
npx expo install onnxruntime-react-native expo-file-system
```

1. Create an `InferenceSession` from the bundled ONNX asset (copy it out of assets to the document directory first, OR load from `require()` bytes).
2. Decode the captured photo to a 256×256 RGB tensor, ImageNet-normalize
   (`mean=[0.485,0.456,0.406]`, `std=[0.229,0.224,0.225]`), layout **CHW**, add batch dim → `[1,3,256,256]`.
3. Run → `e` (512-d). L2-normalize.
4. Zero-shot: cosine vs each group's rows in `prompt_embeddings.npy`; argmax.
5. Probe override: if `probes.json[group]` exists → `argmax(W·e + b)` over `labels`.
   Groups currently probed: `slot` (0.930), `formality` (0.942), `pattern` (0.419), `fit` (0.406).
   Color uses classical CV (center-crop median → palette), not a probe.
6. User tag corrections are the training signal for the next probe version.

Everything after the embedding is pure TS. `src/lib/vision.ts` exposes `VisionTagger`; swap `mockTagger` for `OnnxTagger` in `src/app/_layout.tsx`.

## Current status

`src/lib/vision.ts` ships a deterministic **mock tagger** so the full product loop (capture → tags → engine → learning) is testable today. The ONNX tagger is the next integration step; the bundle is in `ml/artifacts/`.

## Color

The color probe is the production path (0.642 on Fashion Product). Classical LAB k-means scored 0.266 and is not shipped. User corrections fix the rest.
