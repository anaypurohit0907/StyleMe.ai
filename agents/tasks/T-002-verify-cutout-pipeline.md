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
updated_at: 2026-11-24T19:03Z
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
