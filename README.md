# StyleMe.ai

[![Android APK](https://github.com/anaypurohit0907/StyleMe.ai/actions/workflows/android.yml/badge.svg)](https://github.com/anaypurohit0907/StyleMe.ai/actions/workflows/android.yml)

Outfit recommendations from first principles — not trends.

Photograph your clothes once. The app tags each piece **on-device**, keeps the photos on your phone, and gives you **three outfits a day** for the weather, occasion, and mood. It learns from which one you pick, and never suggests something that's in the wash.

## Repo layout

```
apps/
  mobile/     Expo + React Native (iOS + Android, one codebase)
  worker/     Cloudflare Worker API (Hono + D1 + R2)
packages/
  schema/     Shared zod types (single source of truth)
  engine/     Pure TS recommendation engine (rules + learning + exploration)
  design/     Design tokens
ml/           Colab notebooks 00–04 + taxonomy + artifacts
docs/PLAN.md  Product/architecture plan
docs/RELEASE.md  Release train, beta gates, rollback
```

## Quickstart

```bash
npm install

# tests + typecheck
npx turbo run test --filter=@styleme/engine --filter=@styleme/worker
npx turbo run typecheck --filter=@styleme/schema --filter=@styleme/engine \
  --filter=@styleme/worker --filter=@styleme/mobile

# app
npm run mobile:start

# worker (local)
npm run worker:dev
```

## How it works

- **Tagging:** MobileCLIP-S1 image tower (ONNX, 512-d) → cosine against taxonomy prompt embeddings → zero-shot labels. Linear probes override slot (`0.930`), formality (`0.942`), and color (`0.642`). Pattern/fit stay zero-shot until a train-split probe is built.
- **Recommendation:** interpretable rules (completeness, color harmony, formality, silhouette, pattern, weather, rotation, preference) + Thompson-sampling exploration over outfit signatures. Always ≥3 options. Pure TypeScript; runs in the worker and offline in the app.
- **Learning:** EWA preference vector (`α=0.15`) updated on each pick; rejected options get a weaker negative nudge. The anti-herd invariant is a CI property test: 1,000 simulated users over 40 days must diverge without becoming monotone.
- **Tone:** word-bank substitution (Gen Z / millennial / classic) + optional Gemini rewrites, cached per user per day.
- **Privacy:** photos stay on-device by default; the worker stores attributes + embeddings, not photos.

## ML pipeline

See [`ml/README.md`](ml/README.md). Run notebooks in order:

1. `00_setup_and_download.ipynb` — verified datasets
2. `01_taxonomy_and_zero_shot.ipynb` — prompts, eval, ONNX export (parity 1.000)
3. `02_probe_finetune_and_export.ipynb` — linear probes + app bundle
4. `03_compatibility_abo.ipynb` — Polyvore baseline (negative result: item-id CF doesn't transfer)

The app bundle is `ml/artifacts/styleme_vision_v1.zip`. Copy the ONNX + JSON files into `apps/mobile/assets/vision/` for a dev build.

## Install the test APK

Download the latest arm64 APK from
[apk-latest](https://github.com/anaypurohit0907/StyleMe.ai/releases/tag/apk-latest) and install it
on an Android phone (allow "install unknown apps"). It is debug-signed for
testing, not Play Store distribution. Release assets are published manually
from a verified build run, so `apk-latest` can lag `main` by design.

The release APK bundles JS + the MobileCLIP-S1 ONNX model, so tagging runs
on-device with no laptop/Metro. Tester guide: [`docs/TESTING.md`](docs/TESTING.md).

## Deploy the worker

The deploy is **Anay-gated**. Use [`docs/RELEASE.md`](docs/RELEASE.md) for the
full release train (migration inventory, deploy order, smoke tests, rollback).
For a fresh worker install:

```bash
cd apps/worker
npx wrangler login
npx wrangler d1 create styleme          # paste the database_id into wrangler.jsonc
npx wrangler r2 bucket create styleme-photos
npx wrangler d1 migrations apply styleme --remote
npx wrangler secret put JWT_SECRET      # any long random string
npx wrangler deploy
```

Then set `EXPO_PUBLIC_API_BASE=https://styleme.<subdomain>.workers.dev` for the app.

## Status

- Engine: 71 tests green (including the 1,000-user uniqueness simulation).
- Worker: 23 tests green; D1 migrations through `0003` are live, `0004` is pending for the next approved deploy.
- ML: notebooks 00–04 run on a T4; ONNX parity exact; probes + background-augmented slot head shipped (`vision-v2`).
- App: onboarding, Today (3 outfits), Wardrobe, Capture + tag editor, item detail, Style DNA, streak/first-outfit/polls, dark mode, motion; local SQLite + offline engine. ONNX tagger is wired behind a dev-build check; Expo Go uses a deterministic mock tagger.
- Release: arm64 APK auto-builds from `main`; test guide [`docs/TESTING.md`](docs/TESTING.md), release/beta checklist [`docs/RELEASE.md`](docs/RELEASE.md).

## License

See [`LICENSE`](LICENSE).
