# Test StyleMe on Android

## Install

1. Scan this with the phone (or open **https://github.com/anaypurohit0907/StyleMe.ai/releases/tag/apk-latest**):

   ![APK QR](apk-qr.png)
2. Download `app-release.apk`.
3. Allow "install unknown apps" for the browser/file manager when prompted.
4. Install and open **StyleMe**.

Requirements: arm64 Android phone (almost all phones since ~2017), Android 8+.
The APK is debug-signed for testing, not Play Store distribution.

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
  classical CV for color. No network needed. Color is strong on solid garments;
  patterned/multi-color pieces may need a correction — those corrections become
  training data for the next probe version.
- **Recommendations:** the real `@styleme/engine` runs locally, offline.
- **API:** `https://styleme-api.style-me.workers.dev` (Cloudflare Worker + D1)
  is live for auth/sync/recommend. The app currently computes locally and can
  sync later.
- **Photos:** stay on the phone. R2 photo backup is disabled.

## Known limits

- Pattern/fit are zero-shot until a Fashionpedia train-split probe is built.
- The release APK is arm64-only.
- No account system: each install is a separate device identity.
- Reinstall keeps data only if the app data is not cleared.

## Build / release

Every push to `main` that touches `apps/mobile/**` builds a new arm64 release APK
in GitHub Actions and replaces the `apk-latest` release asset.
