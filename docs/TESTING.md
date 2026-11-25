# Test StyleMe on Android

## Install

1. Scan this with the phone (or open **https://github.com/anaypurohit0907/StyleMe.ai/releases/tag/apk-latest**):

   ![APK QR](apk-qr.png)
2. Download `app-release.apk`.
3. Allow "install unknown apps" for the browser/file manager when prompted.
4. Install and open **StyleMe**.

Requirements: arm64 Android phone (almost all phones since ~2017), Android 8+.
The APK is signed with a stable test key, not Play Store distribution.
If you installed an earlier debug-signed build, uninstall it once before installing
this one (Android rejects signature changes on update).

## First run (about 2 minutes)

1. Name + city → vibe words → laundry habit.
2. **Add** tab → photograph one piece per shot:
   - a top
   - a bottom
   - shoes
   - (or a dress + shoes)
3. Auto-tags appear. Fix anything wrong, then **Add to wardrobe**.
4. **Today** → 3 outfits. Tap **Wear this**.
5. **Wardrobe** → tap an item → laundry / wash / edit tags.
6. **Style DNA** → see what it learned.

## What is real vs mock

- **Tagging:** on-device MobileCLIP-S1 ONNX + linear probes for slot/formality,
  classical CV for color, and a small MobileNetV3 subtype classifier
  (t-shirt/shirt/shorts/etc., confidence-gated). No network needed.
  Patterned/multi-color pieces may need a correction — those corrections become
  training data for the next probe version.
- **Recommendations:** the real `@styleme/engine` runs locally, offline.
- **API:** `https://styleme-api.style-me.workers.dev` (Cloudflare Worker + D1)
  is live for auth/sync/recommend. The app currently computes locally and can
  sync later.
- **Photos:** stay on the phone. R2 photo backup is disabled.

## Scan log (for bug reports)

Release builds do not print console logs to `adb logcat`. The pullable
`styleme.log` is the source of truth (see below); the in-app tail is tucked
away as diagnostics:

- **Add** → take a photo → the busy overlay shows the current step.
- **Style DNA** → **Re-scan wardrobe tags** → the button shows progress.
- **Style DNA** → tap **Diagnostics** (bottom link) → last 40 in-memory lines.
  Tap **Hide diagnostics** to put it away.

Useful lines:

- `prepared 1024x1219` — photo was normalized (rotation baked in).
- `mask ... cov=0.42 bbox=... useMask=true` — cutout found the garment.
- `useMask=false` — mask looked wrong, so the full photo was kept.
- `slot model -> top conf=0.62 [top=0.62 bottom=0.21 ...]` / `subtype model -> t-shirt conf=0.81` — classifier output.
- `FAILED ... timed out` / `ERROR` — that item was skipped; the scan moved on.

## Logs from a laptop

Release builds write the same lines to an **app-specific external file** that
`adb` can read without root:

```bash
adb pull /sdcard/Android/data/com.o_anay.styleme/files/styleme.log
tail -f styleme.log
# or stream directly:
adb shell tail -f /sdcard/Android/data/com.o_anay.styleme/files/styleme.log
```

- Format: `2026-11-24T20:32:10.123Z [scan] message` (UTC; `WARN`/`ERROR` for levels).
- Rotates at 2 MB; the previous file is `styleme.log.1`, and its tail is loaded
  into Diagnostics at the next launch (so a crash before rotation still shows).
- Style DNA → **Diagnostics** shows the last 40 in-memory lines; the file is
  authoritative and survives a crash.
- Dev/Metro: `npx expo start` prints the same `[StyleMe]` lines in the terminal.
- iOS/Expo Go fall back to the app document directory.

## Known limits

- Pattern/fit are zero-shot until a Fashionpedia train-split probe is built.
- The release APK is arm64-only.
- No account system: each install is a separate device identity.
- Reinstall keeps data only if the app data is not cleared.

## Build / release

Every push to `main` that touches `apps/mobile/**` builds a new arm64 release APK
in GitHub Actions and replaces the `apk-latest` release asset.

## Agent-side emulator (no phone)

Use the **Emulator smoke (x86_64)** GitHub workflow. It runs on a
`macos-15-intel` runner (HVF-accelerated AVD), builds the release APK for `x86_64`
(`EXPO_PUBLIC_VISION=onnx` + the `vision-v2` bundle), boots an API 34
`google_apis` AVD, installs, launches, screenshots, and pulls the log:

1. GitHub → **Actions** → **Emulator smoke (x86_64)** → **Run workflow**.
2. Download the `emulator-smoke` artifact: `emulator.png`, `styleme.log`,
   `logcat.txt`.

Why not local: this repo's host segfaults in QEMU ~60–90 s into every AVD boot
(API 34 and 36, all GPU/accel workarounds). The ubuntu runners do not expose
`/dev/kvm`; macOS-13 Intel provides HVF acceleration for the x86_64 image.

The workflow is manual (`workflow_dispatch`); it does not run on every push.
