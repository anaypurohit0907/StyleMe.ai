---
id: T-046
title: Android emulator device-test lane — no dependency on Anay's phone
status: backlog
owner:
priority: high
depends_on: []
files:
  - docs/TESTING.md
  - apps/mobile/README.md
updated_at: 2026-11-25T07:55Z
---

## Goal

Anay's phone is no longer available for device checks. Stand up a local
Android emulator lane so install/log/UI checks can run without him.

Known constraints: the CI release APK is **arm64-only** (`android.yml`), so an
x86_64 AVD cannot install it directly. Options to verify and document:

1. Local dev build against an x86_64 AVD: `npx expo run:android` (debug) —
   requires Android Studio/SDK + an AVD; check KVM availability first.
2. Arm64 AVD (slow but native) if the host supports it.
3. Build a release APK with an x86_64 ABI in Gradle/CI if (1) is impractical.

Deliverable: a `docs/TESTING.md` section with the exact working commands
(AVD creation, install, `adb logcat`/`adb pull` paths) and any host
prerequisites found. No app code change. If no emulator can run in this
environment, document the blocker + the CI build-profile change needed and
feed a follow-up.

## Log (append-only)

- [2026-11-25 07:55 UTC] created (Onyx, Anay order via relay: stop depending
  on his phone; emulator lane for device-dependent checks).
