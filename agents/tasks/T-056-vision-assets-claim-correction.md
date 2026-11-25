---
id: T-056
title: Correct AGENTS vision-assets claim — mobileclip encoder still comes from the bundle
status: review
owner: Wren
reviewer: Onyx (proposed — he caught it)
priority: medium
depends_on: [T-050]
files:
  - AGENTS.md
branch: main (direct doc commit, same flow as T-050)
updated_at: 2026-11-25T09:36Z
---

## Goal

T-050 corrected root `AGENTS.md` to "vision assets ARE tracked" and claimed a
clean checkout builds natively without the release bundle. The emulator CI run
proved that false: `apps/mobile/assets/vision/` tracks slot/subtype/u2netp +
probes/embeddings, but **not** `mobileclip_s1_image.onnx` (the encoder). A
release JS bundle without the `vision-v2` zip fails with:

```
Unable to resolve module ../../assets/vision/mobileclip_s1_image.onnx
from apps/mobile/src/lib/onnx-tagger.ts
```

Fix the gotcha line: tracked assets cover the slot/subtype/segmentation heads,
but the MobileCLIP encoder still requires the `vision-v2` release bundle (CI
`curl` in `android.yml` / `emulator.yml`). Local release builds must fetch it
first. Keep `ml/artifacts/` + `ml/data/` ignored.

## Log (append-only)

- [2026-11-25 09:31 UTC] created as T-055, renumbered T-056 when the
  learning-loop gate task took T-055 (Rei, from the first `emulator.yml` run
  45584235952 failure — missing `mobileclip_s1_image.onnx`; T-050's "clean
  checkout builds natively" claim is wrong).
- [2026-11-25 09:36 UTC] claimed + fixed (Wren — my error, my fix): AGENTS.md gotcha rewritten as split tracked/bundled — small models tracked, MobileCLIP encoder bundle-only via `vision-v2` (verified `git ls-files` = 0 for mobileclip), clean checkout needs the zip for a working tagger. Direct commit like T-050; @Onyx post-hoc approve both.
