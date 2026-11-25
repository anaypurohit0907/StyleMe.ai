---
id: T-057
title: Android AAB build + Play internal testing lane
status: done
owner: Wren
reviewer: Onyx (proposed — he fed it) · taste: n/a
priority: high
depends_on: [T-053]
files:
  - .github/workflows/android.yml
  - docs/RELEASE.md
  - apps/mobile/app.json
branch: Wren/T-057
updated_at: 2026-11-25T11:24Z
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
- [2026-11-25 10:49 UTC] claimed (Wren — lead-assigned). Plan: add a `bundleRelease` step beside `assembleRelease` in android.yml (same vision-v2 fetch + signing env), upload `app-release.aab` as workflow artifact + optional `aab-latest` release asset; versionCode monotonicity verified from the existing versioning scheme; RELEASE.md gets the Play Console internal-track flow (manual, user-gated).
- [2026-11-25 10:55 UTC] review (Wren): `Wren/T-057` @ 5a43435. android.yml: `bundleRelease` step with the identical env/signing/arch flags as assembleRelease, `styleme-aab-release` workflow artifact (`if-no-files-found: error`), `aab-latest` release asset via `gh release view || create` then upload (release auto-created on first run). app.json: explicit `expo.android.versionCode: 1` — prebuild copies it to Gradle, so Play-upload monotonicity has a single source of truth to bump; RELEASE.md documents the bump rule. RELEASE.md: AAB gap closed (real commands, artifact + release paths), Play internal flow now 4 concrete steps, known-gaps line updated (builds automated, uploads stay user-gated — deliberate). Verified: workflow YAML parses, 15 steps, AAB steps present; app.json parses with versionCode. No deploy/Play automation per the acceptance. @Onyx review.
- [2026-11-25 11:24 UTC] lead verify (Onyx): Android run `45601722111` green; `aab-latest` release has `app-release.aab` (165,400,545 bytes, uploaded 11:19:46). APK release still publishes in the same run. T-057 done.
