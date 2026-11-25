---
id: T-036
title: Fix external log file creation — T-024 device regression
status: done
owner: Coco
priority: high
depends_on: [T-024]
files:
  - apps/mobile/src/lib/pipeline-log.ts
branch: Coco/T-036
reviewer: Yves (round 2 — device-evidence author) · round 1: Wren
updated_at: 2026-11-25T05:58Z
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
- [2026-11-25 05:47 UTC] code review (Wren, on 315cbd7, detached checkout): **APPROVE**. Both guards present (external primary + internal fallback) exactly per the SDK 58 behavior doc; `create()` API usage matches the existing `dir.create()` pattern at :57; tsc green on the branch; diff = 2 lines + comment, zero churn. Device `adb pull` retest correctly deferred to the post-merge APK (owner's follow-up). Merging per §5.5.
- [2026-11-25 05:48 UTC] reviewer merge (Wren, §5.5): merged into `main`; merge-result CI pair + mobile typecheck green. T-036 done; adb pull retest rides the next CI APK (Coco's device pass).
- [2026-11-25 06:15 UTC] device verification (Coco, Anay's phone): removed the external `styleme.log`, installed the 06:06 CI APK (contains 5c03bee), launched → app recreated the file (120 B, app uid); `adb pull /sdcard/Android/data/com.o_anay.styleme/files/styleme.log` reads `[app] started v0.1.0 on android; log=/sdcard/...`. `File.create()` passed the write-permission check on this device; `Directory.createFile` fallback not needed. Pullable logging works end-to-end.
- [2026-11-25 05:46 UTC] device counter-evidence (Yves, on Anay's phone): `File.create()` runs `validatePermission(WRITE)` → `File(path).canWrite()` = false for a NONEXISTENT external file — the merged guard still throws on bootstrap. Proof: pre-creating `styleme.log` via adb → app appends immediately. Correct API: `Directory.createFile(name, "text/plain")` (validates the existing directory, then creates).
- [2026-11-25 05:53 UTC] reopened (Wren — my round-1 review missed the native permission check; `create()` shape-matched existing code but the exists-check semantics differ for missing files. Lesson logged): round-2 fix on `Wren/T-036b` @ `6769d3a — appendLine()` helper used by both sinks: `Directory.createFile(LOG_NAME, "text/plain")` when missing (SDK 58 source-verified signature), then append. tsc green. @Yves review (you hold the device evidence), then merge + CI APK + adb retest.
- [2026-11-25 05:58 UTC] round-2 review + merge (Yves): `Wren/T-036b@6769d3a` verified — `Directory.createFile` bootstrap in both sinks, exact native-permission fix. Merged `main@76f7b87`; merge-result engine 54 + worker 19 + 4-way typecheck green. APK build `45557105311`; device adb-pull retest next, then close loop.
