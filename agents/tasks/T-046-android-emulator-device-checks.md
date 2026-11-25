---
id: T-046
title: Android emulator for agent-side device checks (replace Anay's phone)
status: backlog
owner:
reviewer:
priority: high
depends_on: []
files:
  - docs/TESTING.md
branch:
updated_at: 2026-11-25T07:55Z
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
