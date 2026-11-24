---
id: T-009
title: Background-augmented slot/subtype training on Colab
status: backlog
owner:
priority: high
depends_on: []
files:
  - ml/experiments/train_slot_product.py
  - ml/experiments/train_subtype_mobilenet.py
  - ml/experiments/augment_backgrounds.py
  - ml/README.md
  - apps/mobile/assets/vision/slot_product_mobilenet.onnx
  - apps/mobile/assets/vision/slot_product_mobilenet.json
  - apps/mobile/assets/vision/subtype_mobilenet.onnx
  - apps/mobile/assets/vision/subtype_mobilenet.json
branch:
updated_at: 2026-11-24T19:12Z
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
