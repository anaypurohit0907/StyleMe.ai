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

Release builds do not print console logs to `adb logcat`. Instead, every
capture and re-scan step is shown on screen:

- **Add** → take a photo → the busy overlay shows the current step, and the
  review screen keeps the last 8 lines under **Last capture**.
- **Style DNA** → **Re-scan wardrobe tags** → the button and the **Scan log**
  card show progress and the last 14 lines.

Useful lines:

- `prepared 1024x1219` — photo was normalized (rotation baked in).
- `mask ... cov=0.42 bbox=... useMask=true` — cutout found the garment.
- `useMask=false` — mask looked wrong, so the full photo was kept.
- `slot model -> top` / `subtype model -> t-shirt conf=0.81` — classifier output.
- `FAILED ... timed out` — that item was skipped; the scan moved on.

The log is also appended to `pipeline.log` in the app's document directory and
reloaded on the next launch, so a crash does not erase the last step.

## Known limits

- Pattern/fit are zero-shot until a Fashionpedia train-split probe is built.
- The release APK is arm64-only.
- No account system: each install is a separate device identity.
- Reinstall keeps data only if the app data is not cleared.

## Build / release

Every push to `main` that touches `apps/mobile/**` builds a new arm64 release APK
in GitHub Actions and replaces the `apk-latest` release asset.
