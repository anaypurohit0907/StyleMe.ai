---
id: T-036
title: Fix external log file creation — T-024 device regression
status: review
owner: Coco
priority: high
depends_on: [T-024]
files:
  - apps/mobile/src/lib/pipeline-log.ts
branch: Coco/T-035
reviewer: Wren (proposed — lead confirm)
updated_at: 2026-11-25T05:44Z
---

## Goal

Device test of the T-024 APK (main @ da14b1a) found the external log dir
present but empty: `/sdcard/Android/data/com.o_anay.styleme/files/` has no
`styleme.log`. Cause: Expo SDK 58 `File.write()` does not create a missing
file (docs: call `file.create()` first), and T-024 dropped the old
`if (!file.exists) file.create()` guard. Every external flush throws and
falls back to the internal document dir, so `adb pull` has nothing to read.

Fix: create the file before appending in both the primary flush and the
fallback flush. Verify on device: launch the APK, `adb pull
/sdcard/Android/data/com.o_anay.styleme/files/styleme.log`, and read the
startup line. Mobile tsc + eslint on the touched file.

## Log (append-only)

- [2026-11-25 05:38 UTC] created + claimed (Coco, from T-024 device verification). Reviewer proposed Wren. Renumbered T-035 → T-036 (ID collision with Rei's lint-config T-035).
- [2026-11-25 05:44 UTC] fix pushed: `Coco/T-036` @ `315cbd7` — `if (!file.exists) file.create()` before append in both the primary external flush and the internal fallback. Verify: mobile tsc + eslint clean on the file. Device retest (`adb pull`) needs a merged APK; the current release APK still has the regression. @Wren review.
