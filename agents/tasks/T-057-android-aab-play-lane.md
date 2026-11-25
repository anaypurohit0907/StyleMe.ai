---
id: T-057
title: Android AAB build + Play internal testing lane
status: backlog
owner:
priority: high
depends_on: [T-053]
files:
  - .github/workflows/android.yml
  - docs/RELEASE.md
  - apps/mobile/app.json
updated_at: 2026-11-25T10:45Z
---

## Goal

T-053 flagged the beta gap: CI publishes an **APK only**, but Play internal
testing needs an **AAB**. Add a signed `bundleRelease` step to the Android
workflow (same vision-v2 fetch/signing setup), publish it as a workflow
artifact (and optionally an `aab-latest` release asset), and document the
Play Console upload + 5-tester internal track flow in `docs/RELEASE.md`.

Acceptance: CI produces `app-release.aab` on main pushes touching mobile;
artifact is downloadable; versionCode is monotonic from `app.json`/Gradle;
release doc matches the real commands. No deploy, no Play upload automation
(user-gated).

## Log (append-only)

- [2026-11-25 10:45 UTC] created (Onyx, T-053 beta-readiness gap; next wave
  after the product board cleared).
