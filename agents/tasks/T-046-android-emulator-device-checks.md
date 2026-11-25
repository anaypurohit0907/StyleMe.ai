---
id: T-046
title: Android emulator for agent-side device checks (replace Anay's phone)
status: blocked
owner: Rei
reviewer: Onyx
priority: high
depends_on: []
files:
  - docs/TESTING.md
  - .github/workflows/emulator.yml
branch: Rei/T-046
updated_at: 2026-11-25T12:27Z
---

## Goal

Anay's phone is no longer available for device testing. Stand up a local Android
emulator + an installable x86_64 build so agents can run the device-dependent
checks themselves: app boot, `adb pull` of `styleme.log`, SecureStore/keychain
path, visual screenshots, and the T-008 re-scan flow on a disposable profile.

## Environment already present (verified 07:55 UTC)

- Android SDK: `~/Android/Sdk` (platforms 34/36.1/37, build-tools, NDK, emulator).
- AVD already defined: `Medium_Phone_API_36.1` (`~/Android/Sdk/emulator/emulator -list-avds`).
- `adb` on PATH, `/dev/kvm` accessible.
- Resource caveat: host has 7 GB RAM (~1 GB free at check time), 12 cores.
  Emulator + Gradle concurrently can OOM — stop idle worktrees/builds first, or
  run headless (`-no-window -gpu swiftshader_indirect`) for log/adb checks.
  Screenshots via `adb exec-out screencap -p > shot.png`.

## Build note

CI's APK is arm64-only (`android.yml`: `assembleRelease -PreactNativeArchitectures=arm64-v8a`)
and will not install on an x86_64 AVD. Build a debug/dev x86_64 APK locally:

1. Start the AVD (`emulator -avd Medium_Phone_API_36.1 ...`), `adb wait-for-device`.
2. `npx expo prebuild -p android` (android/ is generated + gitignored).
3. `cd apps/mobile/android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64`
   (or `npx expo run:android` with the AVD running).
4. `adb install -r app/build/outputs/apk/debug/app-debug.apk`, launch, then verify
   `adb pull /sdcard/Android/data/com.o_anay.styleme/files/styleme.log`.

## Acceptance

- App boots to Today on the AVD with no crash.
- `styleme.log` exists and pulls via adb; startup line readable.
- A screenshot can be captured for visual checks.
- `docs/TESTING.md` has the exact emulator + x86_64 build + adb commands.
- No host-specific paths committed outside docs.

## Log (append-only)

- [2026-11-25 07:55 UTC] created (Rei, from relay(Anay) 07:52 — no more phone
  testing; set up an emulator). AVD + SDK already present; build/ABI and
  resource notes included so the owner starts from facts, not a blank page.
  Coco's expo-haptics lint task is T-047 (they renumbered it); this task keeps
  T-046 per that split.
- [2026-11-25 08:02 UTC] claimed (Rei). Host check: AVD `Medium_Phone_API_36.1`
  (x86_64, Play Store image) + SDK + KVM present; ~1.9 GB RAM available +
  swap. Plan: boot headless, verify adb/screenshot, then build x86_64 debug
  APK and document in docs/TESTING.md. T-029 review duty continues in parallel
  (no code files in this task).
- [2026-11-25 08:20 UTC] blocker found: `emulator -avd Medium_Phone_API_36.1`
  segfaults (exit 139) ~1-2 min into every boot, after GRPC/display init.
  Reproduced with `-gpu swiftshader_indirect`, `-gpu off`, `-feature -Vulkan`,
  `-accel off` (TCG), `-cores 1/2`, `-memory 1024/1536/2048`, `-wipe-data`;
  log ends at "Activated packet streamer" with a QEMU protected-range unmap
  warning. adb shows `emulator-5554 offline` then the process dies. Likely
  emulator 36.4.10 / API 36.1 image incompatibility with this host kernel or
  RAM pressure, not an app issue.
- [2026-11-25 08:25 UTC] next attempt: install the lighter
  `system-images;android-34;google_apis;x86_64` (cmdline-tools fetched to
  `/home/anay/tmp-cmdtools`, sdkmanager download in progress), create a fresh
  API 34 AVD, boot with `TMPDIR` on `/home` (host `/tmp` is a 3.6 GB tmpfs,
  725 MB free). If API 34 also segfaults, document the host limitation +
  exact commands and hand the lane back to the lead with evidence.
- [2026-11-25 09:02 UTC] API 34 image installed (sdkmanager was ~164 KB/s;
  switched to 8 parallel HTTP range streams — 1.56 GB in ~3 min). Unzipped to
  `~/Android/Sdk/system-images/android-34/google_apis/x86_64/`, wrote a
  minimal `package.xml` (the sys-img zip ships only `source.properties`), and
  created AVD `Medium_API_34` (pixel_6, Android 14, google_apis/x86_64) with
  the SDK-root cmdline-tools copy at `~/Android/Sdk/cmdline-tools/latest`.
  Booting headless now; API 36 AVD remains unusable (segfault).
- [2026-11-25 09:15 UTC] local emulator verdict: **unusable on this host**.
  API 34 also reaches `adb device` then segfaults ~60-90 s in; repro'd with
  `-gpu swiftshader_indirect/off/guest`, `LIBGL_DRI3_DISABLE=1`,
  `advancedFeatures.ini` (`Vulkan=off`, `GLDirectMem=on`), `-accel off`,
  `-qemu -cpu qemu64`, Bluetooth/WiFi/UWB disabled, 1-2 GB RAM, 1-2 cores,
  headless + windowed. Log always ends after "Activated packet streamer for
  bluetooth emulation" with the QEMU protected-range unmap warning → host
  kernel/emulator-36.4.10 incompatibility, not the image.
  **Pivot:** add a `workflow_dispatch` GitHub Actions emulator lane
  (ubuntu-latest has KVM) that builds the x86_64 release APK, boots API 34,
  installs, screenshots, and pulls `styleme.log`. Extending files with
  `.github/workflows/emulator.yml`; docs get both the local attempt (for the
  record) and the CI lane (the supported path).
- [2026-11-25 09:21 UTC] CI lane pushed: branch `Rei/T-046` @ `7b0b53e`
  (`.github/workflows/emulator.yml` + `docs/TESTING.md` section). It reuses
  `android.yml`'s release-signing step, builds
  `assembleRelease -PreactNativeArchitectures=x86_64` with
  `EXPO_PUBLIC_VISION=onnx`, then `reactivecircus/android-emulator-runner`
  (API 34, google_apis, x86_64, pixel_6) installs/launches and uploads
  `emulator.png`, `styleme.log`, `logcat.txt`. Temporary push trigger on the
  branch for the first run: workflow `45584235952` (in progress).
- [2026-11-25 11:55 UTC] CI run `45603304885` progress (Onyx review): API 30 AVD **booted** (841s) and settings/animation steps passed; failure is now `adb install` on the 191MB APK — `cmd: Failure calling service package: Broken pipe (32)` after ~3.5 min. Infra, not app. Next lever: `adb install --no-streaming -r` or `adb push` + `pm install -r /data/local/tmp/app.apk` with a longer timeout; keep the 30-min boot budget.
- [2026-11-25 12:18 UTC] **BLOCKED — no working emulator lane on any available runner.** Full evidence:
  (a) local host: QEMU segfault 60–90 s into every boot, API 36 + 34,
  swiftshader/gpu-off/guest, `-accel off`, `-qemu -cpu qemu64`,
  Bluetooth/WiFi/UWB off, `LIBGL_DRI3_DISABLE=1`, `Vulkan=off/GLDirectMem=on`,
  1–2 GB, headless + windowed.
  (b) ubuntu-latest: no `/dev/kvm`; action disables HW accel, TCG cannot boot
  API 34 in 600 s (`45585896749`).
  (c) macos-14 arm64: "configuration not supported" (`45590022060`).
  (d) macos-15-intel: API 30 boots (338–841 s) then the emulator dies on the
  first post-boot `settings` / `adb install` (`Broken pipe`) — `45591777774`,
  `45599257739`, `45603304885`.
  (e) macos-15 arm64: emulator never connects to adb (`45608844901`).
  `adb install --no-streaming` + `adb push`/`pm install` fallback applied; the
  emulator process itself dies, so the install never runs.
  Unblocks: a physical Android phone (arm64 APK) or a self-hosted runner with
  working KVM/nested virtualization. Docs branch `Rei/T-046` @ `756680b`
  records the blocked state in `docs/TESTING.md` + `docs/RELEASE.md` and
  removes the broken workflow; Onyx to merge. T-046 stays blocked until then.
- [2026-11-25 12:27 UTC] **blocked + stopped (Onyx, per Anay):** final run `45608844901` failed after 21m44s — API 30 AVD booted, but the 191MB APK install died (`Broken pipe`/`cmd package` failure) even with `--no-streaming` + push/pm fallback. Hosted runners cannot reliably virtualize+install this app (Ubuntu no KVM; macos HVF boot ~14 min; install pipe unstable). Phone is back and covers device checks. Lane documented as unsupported on hosted CI; do not keep burning runs.
