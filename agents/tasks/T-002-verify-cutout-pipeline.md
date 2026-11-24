---
id: T-002
title: Verify on-device cutout pipeline and finish vision logs
status: in-progress
owner: Yves
priority: high
depends_on: []
files:
  - apps/mobile/src/lib/pipeline-log.ts
  - apps/mobile/src/lib/segment.ts
  - apps/mobile/src/lib/png.ts
  - apps/mobile/src/lib/onnx-tagger.ts
  - apps/mobile/src/components/scan-log.tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/app/_layout.tsx
  - apps/mobile/package.json
  - package-lock.json
  - docs/TESTING.md
  - .github/workflows/android.yml
branch: Yves/T-002
updated_at: 2026-11-24T19:40Z
---

## Goal

Install the latest arm64 release on the connected phone and verify the cutout +
vision pipeline end to end: one new capture, one full wardrobe re-scan, visible
scan-log lines for every model step, correct slot/subtype persistence, and
transparent cutout thumbnails. Fix any blocker found and leave the release
branch in a shippable state.

## Log (append-only)

- [2026-11-24 19:03 UTC] claimed (Yves).
- [2026-11-24 19:03 UTC] context: visible scan log, 1024px prep, stored-block PNG encoder, and jpeg-js Buffer polyfill are already on `main` (`c1d46e1`). Latest CI build succeeded after one flaky `packageRelease` retry.
- [2026-11-24 19:03 UTC] device `00256665B000161` was disconnected before install; reconnect needed before on-device verification.
- [2026-11-24 19:12 UTC] Buffer polyfill verified on device (`c1d46e1`): 7/7 re-scanned in 49s, no failures; 5–7s/item. Cutout PNG 1.5–3MB, mask cov 0.29–0.85, log shows every decode/infer/encode/write step. Blocking bug from prior build (missing `Buffer` at gray-JPEG encode) is gone.
- [2026-11-24 19:12 UTC] Quality signal: final slots = 4 bottom, 1 top, 2 accessory; all tagged grey/black. Slot model + MobileCLIP agree, so this is preprocessing/input quality, not a broken session. Next: alpha-aware white composite + mask-bbox crop in tagger, then compare. Need true slots from user (Q-002) to score accuracy.
- [2026-11-24 19:15 UTC] implemented alpha-aware tagger (`5bc3265`): JS PNG decoder for our stored-block cutouts, opaque bbox crop, square white composite for MobileCLIP/slot/subtype, color from opaque pixels only, top-3 logits in scan log; removed gray JPEG + Buffer path. `tsc` + `expo export` pass. Next: device re-scan, compare slot/color distribution.
- [2026-11-24 19:18 UTC] device result on `5f38ee1`: 7/7 in 26s, alpha path confirmed (`decoded 1024x1360 alpha=true bbox=180,162 931,1359`), colors now real (rust/tan/navy/black) instead of all grey. Slots still accessory-heavy (4 accessory, 1 outerwear, 1 top, 1 bottom), but subtype is confident on some (`sweater 0.78`) while slot says accessory. Portrait mask bboxes open Q-003: worn photo vs flat-lay changes the fix. Next heuristic: subtype-assisted slot rescue only for `accessory` when subtype ≥0.65.
- [2026-11-24 19:22 UTC] added subtype/slot ensemble (`c559778`): slot confidence from softmax; when subtype ≥0.70 and slot <0.60, rescue to subtype slot and log the override. Keeps high-confidence slot predictions. `tsc` + `expo export` pass; building.
- [2026-11-24 19:38 UTC] user answered Q-002: "i tagged them correctly" + dataset order (T-023). Caveat posted: if that meant manual edits, the 19:35 re-scan happened before T-008 and may have overwritten them. Paused all further wardrobe re-scans until T-008. Current grid: 4 accessory, 1 outerwear, 1 top, 1 bottom. Q-003 (worn vs flat-lay photos) still open.
