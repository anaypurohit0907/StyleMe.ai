# Release train + beta readiness

One source of truth for the next release window. **Deploy is Anay-gated** — this
file records order and commands, not authorization. Do not run the deploy steps
until Anay posts `deploy approved` on the chatboard.

_State at 2026-11-25 09:09 UTC · worker live `a934ce2f` (06:13) · migrations
`0003` applied, `0004` pending · engine 71 / worker 23 tests green. Re-read the
main SHA at release time — do not treat this snapshot as the release commit._

## 0. Pre-flight (always)

```bash
npm ci
npx turbo run test --filter=@styleme/engine --filter=@styleme/worker
npx turbo run typecheck --filter=@styleme/schema --filter=@styleme/engine \
  --filter=@styleme/worker --filter=@styleme/mobile
cd apps/mobile && npx expo lint
```

Expected: engine 71, worker 23, tsc ×4, lint 0 errors (9 pre-existing warnings).
Do not release on red. Record the main SHA in the release note.

## 1. Version + migration inventory

```bash
# repo root
git rev-parse --short main                      # release SHA
(cd apps/worker && npx wrangler d1 migrations list styleme --remote)
```

As of this writing only `0004_learn_dedupe.sql` should be pending. `0004` is
additive (`learn_events` table + prune index); it is safe to leave in place on a
worker-code rollback.

**Order: migrate first, deploy in the same session.** The 0002/0003 schema and
the deployed worker code are live-schema-sensitive; never migrate without
deploying, never deploy without migrating.

```bash
# repo root — applies 0004 remotely, then prints the live version history
npm run db:migrate -w @styleme/worker
(cd apps/worker && npx wrangler deployments list)
```

## 2. Worker deploy (after Anay approval)

```bash
# repo root — one session: migrate, deploy, verify
npm run db:migrate -w @styleme/worker
npm run worker:deploy

curl -sS https://styleme-api.style-me.workers.dev/health
# -> {"ok":true,"ts":...}

# validation smoke (bad request must be 400, not 500)
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST https://styleme-api.style-me.workers.dev/v1/auth/device \
  -H 'content-type: application/json' -d '{"deviceId":"x"}'
# -> 400
```

Notes:

- `JWT_SECRET` must already exist on the worker (`npx wrangler secret put JWT_SECRET`).
- Deploy order relative to mobile: the APK that stores `registrationSecret`
  (T-028) must ship in the same window or before the worker. Old APKs that lose
  their cached token against the hardened worker get a hard 403.
- Record the new version id from `wrangler deploy` in the release note.

## 3. Mobile APK (arm64)

Every push to `main` touching `apps/mobile/**` builds an arm64 release APK and
clobbers the `apk-latest` release asset (`.github/workflows/android.yml`). The
build also `curl`s the `vision-v2` bundle over the tracked assets.

```bash
# manual rebuild if needed
gh workflow run android.yml --ref main
gh run list --workflow=android.yml --limit 5

# testers
gh release download apk-latest -p app-release.apk
adb install -r app-release.apk
```

Verify after install:

```bash
adb shell dumpsys package com.o_anay.styleme | grep versionName
adb shell run-as com.o_anay.styleme ls files 2>/dev/null || true
adb pull /sdcard/Android/data/com.o_anay.styleme/files/styleme.log
adb shell tail -f /sdcard/Android/data/com.o_anay.styleme/files/styleme.log
```

Check: boot to Today, tag one capture, one logged wear, Style DNA diagnostics
opens, `styleme.log` contains the startup + scan lines. The previous file is
`styleme.log.1`; the app loads its tail at the next launch (T-034).

### Emulator lane (x86_64)

The CI APK is arm64-only; an x86_64 AVD needs a local debug build. This lane is
**T-046, still pending** — the API 36 AVD segfaulted on this host and the API 34
image was still downloading at 09:09 UTC. Commands for when it boots:

```bash
# SDK is at ~/Android/Sdk (not on PATH by default)
~/Android/Sdk/emulator/emulator -avd <api34_avd> \
  -no-window -no-audio -gpu swiftshader_indirect &
adb wait-for-device
cd apps/mobile
npx expo prebuild -p android
cd android
./gradlew assembleDebug -PreactNativeArchitectures=x86_64
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb exec-out screencap -p > /tmp/styleme.png
```

Keep AVD temp on `/home` (`TMPDIR=/home/anay/tmp-avd`); `/tmp` is a small
tmpfs. Record whether the API 34 image works before claiming a device pass.

## 4. Beta gates

| Gate | Target | How measured |
|---|---|---|
| Crash-free sessions | ≥ 99.5% | Play Console vitals after internal track, plus tester reports; no crash SDK ships yet |
| Onboarding funnel | name/city → vibes → laundry → first capture → first wear | manually tallied per tester until analytics exists; record drop-off step |
| Testers | 5 | Play internal testing list + install confirmation |
| Retention | 2 weeks | tester check-in / wear_log review; no server analytics yet |
| Worker smoke | `/health` ok, auth 400/403 paths, one sync | commands above |

### Play internal testing

1. Create the app in Play Console (package `com.o_anay.styleme`); upload an AAB.
   **Gap:** CI currently publishes an APK only — production/internal Play needs
   `bundleRelease` (or EAS `eas build -p android`), tracked as a follow-up.
2. Testing → Internal testing → create release → add 5 tester emails.
3. Testers opt in via the Play link, install, run the §3 checklist.
4. Promote to closed beta only after the crash-free + retention gates hold.

## 5. Rollback

**Worker** — code rollback is one command; schema rollback is not automatic:

```bash
cd apps/worker
npx wrangler deployments list
npx wrangler rollback <deployment-id>
curl -sS https://styleme-api.style-me.workers.dev/health
```

- Rolling back past 0002 is unsafe without reverting the composite-PK schema:
  old `ON CONFLICT(id)` SQL errors against `(user_id, id)` and vice versa.
- `0004` is additive; a code rollback can leave `learn_events` in place.
- `0003` auth columns are additive; pre-0003 code ignores them.

**APK** — `apk-latest` is clobbered per build. Keep the last known-good APK from
the workflow artifact (30-day retention) or rebuild from the previous main SHA;
there is no published APK history beyond GitHub release/artifact retention.

**Lost registration secret (403)** — recovery is a fresh device id. The
`resetDeviceIdentity()` helper exists in `apps/mobile/src/lib/api.ts` but has no
in-app button yet; until wired, clearing app data (Android) or a fresh install
registers a new worker user. Local wardrobe/photos are unaffected only if the
data was not cleared — say so honestly to testers.

## 6. Known gaps (do not paper over)

- No in-app 403 recovery UI (helper ready; T-028 note).
- No crash/analytics SDK; beta gates rely on Play vitals + manual tallies.
- No AAB/Play upload in CI; internal testing needs a separate build path.
- iOS has no CI build/signing lane yet.
- Emulator x86_64 lane pending (T-046); do not claim device checks before it boots.
- ModaNet/Fashionpedia corpora are non-commercial licensed — eval/research only
  until reviewed for commercial use.
