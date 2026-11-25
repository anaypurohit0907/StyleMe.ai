---
id: T-009
title: Background-augmented slot/subtype training on Colab
status: in-progress
owner: Yves
priority: high
depends_on: [T-023]
reviewer: Wren
files:
  - ml/experiments/train_slot_product.py
  - ml/experiments/train_subtype_mobilenet.py
  - ml/experiments/augment_backgrounds.py
  - ml/README.md
  - apps/mobile/assets/vision/slot_product_mobilenet.onnx
  - apps/mobile/assets/vision/slot_product_mobilenet.json
  - apps/mobile/assets/vision/subtype_mobilenet.onnx
  - apps/mobile/assets/vision/subtype_mobilenet.json
branch: Yves/T-009
updated_at: 2026-11-25T06:45Z
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
