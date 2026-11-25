---
id: T-046
title: Android emulator for agent-side device checks (replace Anay's phone)
status: in-progress
owner: Rei
reviewer: Onyx
priority: high
depends_on: []
files:
  - docs/TESTING.md
  - .github/workflows/emulator.yml
branch: Rei/T-046
updated_at: 2026-11-25T09:15Z
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
