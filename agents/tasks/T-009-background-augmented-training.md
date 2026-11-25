---
id: T-009
title: Background-augmented slot/subtype training on Colab
status: done
owner: Yves
priority: high
depends_on: [T-023]
reviewer: Wren
files:
  - ml/experiments/train_slot_product.py
  - ml/experiments/train_subtype_mobilenet.py
  - ml/experiments/augment_backgrounds.py
  - ml/experiments/train_slot_background_aug.py
  - ml/README.md
  - apps/mobile/assets/vision/slot_product_mobilenet.onnx
  - apps/mobile/assets/vision/slot_product_mobilenet.json
  - apps/mobile/assets/vision/subtype_mobilenet.onnx
  - apps/mobile/assets/vision/subtype_mobilenet.json
  - apps/mobile/assets/vision/slot_background_aug.json
  - apps/mobile/assets/vision/slot_background_aug.onnx
  - apps/mobile/src/lib/onnx-tagger.ts
  - .github/workflows/android.yml
branch: Yves/T-009
updated_at: 2026-11-25T07:55Z
---

## Goal

Train background-invariant slot and subtype heads on Colab (never local):
composite garment cutouts onto varied bed/floor/sofa/plain backgrounds with
random lighting/scale/rotation, keep white-background product images as the
anchor, evaluate on held-out real phone photos, export ONNX + metadata, and
hand the files to a mobile build task. Target is a measured gain on real
photos, not another in-domain number.

## Log (append-only)

- [2026-11-24 19:12 UTC] created (Yves, feed-the-board from T-002). Needs 20–30 real labeled phone photos plus a held-out split before training; user label input tracked in T-002/Q-002.
- [2026-11-25 06:45 UTC] claimed (Yves). T-023 gave the honest baseline (DF2 0.884, FPI 0.964, Fashionpedia 0.534). Plan: Colab-only; FPI white-bg cutouts + procedural bed/floor/sofa backgrounds, baseline vs augmented MobileNetV3-Small, eval on white + augmented + Fashionpedia; export ONNX then mobile build/test. Reviewer Wren.
- [2026-11-25 07:25 UTC] Colab A/B done (FPI 4,276 train / 770 val, seed 0): baseline white **0.953**, synthetic-background **0.387**; augmented white **0.891**, background **0.925**. Background robustness +53.8pp for −6.2pp white. Exported `slot_background_aug.onnx` (5.9MB). Next: integrate as slot head, rebuild, re-scan (T-008 protects user corrections), measure real photos.
- [2026-11-25 07:50 UTC] integrated `slot_background_aug` as the slot head (`onnx-tagger.ts`), created `vision-v2` release bundle (101.7MB) and pointed CI at it; old v1 assets kept. Next: branch review, then merge/build and a guarded re-scan (T-008 corrections protect tags).
- [2026-11-25 07:55 UTC] → review (`0b01925`): slot head switched to `slot_background_aug`, CI points at `vision-v2` bundle. Verify: mobile tsc + py_compile; Colab A/B above. Device re-scan after merge (T-008 protects corrections). Reviewer Wren.
- [2026-11-25 08:23 UTC] code review (Wren, on `Yves/T-009` @ 7d13ef2): **APPROVE**. Training honesty verified line-by-line: both heads share the identical stratified split (seed 0), epochs, optimizer — a real A/B, not two runs; val composites are per-index deterministic; alpha compositing (white→transparent soft ramp + bbox crop) matches the on-device white-composite inference style; metrics reported on BOTH white and augmented val so the −6.2pp white trade is visible, not buried. Wiring: `onnx-tagger.ts` swaps the asset names only; input 224 + ImageNet normalize match the committed `slot_background_aug.json` (and `SUBTYPE_SIZE=224`); CI now curls `vision-v2` (bundle uploaded, 101.7MB) while the 6MB ONNX + json are also git-tracked — consistent with the existing tracked `slot_product_mobilenet.onnx`/`subtype_mobilenet.onnx` (root AGENTS.md's "vision assets not in git" gotcha is stale — flagged for a doc fix, not this task). Ran on a fresh checkout of the branch: CI pair green, mobile tsc green. Numbers (white 0.891 vs 0.953 baseline; synthetic beds/floors 0.925 vs 0.387) directly answer T-023's OOD gap. Merge per TEAM §5.5; taste gate n/a — no user-facing copy.
