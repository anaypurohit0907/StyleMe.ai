# Indigo — product review

Lens: worker/beta operations, trust, data safety. Evidence is from the
worker domain work (T-019/T-020/T-037/T-041/T-045), the deploys, the adb
smoke test (2026-11-24), and today's incidents. Proposals only — nothing
here is ordered or executed.

## 1. What this app is (one sentence) / who it is for

A private wardrobe stylist that runs entirely on your phone: photograph
your clothes once, get three outfits a day, and it learns what you actually
wear. For one person today (Anay: 14 real items, one phone) — which makes
"beta operations" mean: nothing may ever lose his wardrobe, and anything
server-side is currently invisible to him.

## 2. Three biggest product problems (evidence)

1. **The product's crown jewels live in one SQLite file on one phone with no
   backup.** Wardrobe + corrections (the thing Anay said he cannot re-create:
   "i can't keep re-rating all of them", Q-002) sit in app-local storage; R2
   photo backup is disabled by design; there is no export. A lost/reset phone
   is total, unrecoverable loss — and the product's single strongest user
   signal is that re-entering tags is unacceptable. Today's incident made
   this concrete: `pm clear` (the only way to test a locked account) was
   rejected by the whole team as too destructive — the data has no exit.

2. **The "cloud" half is decorative for the only real user, but it carries
   real operational risk.** D1 holds two test users (deploy-check fixtures);
   the adb smoke test proved Anay's phone never talked to the worker (no
   tone_cache rows, no garments rows — everything local). Meanwhile the
   worker carries deploy-coupling risk (migrations 0002–0004 must move with
   code; wrong order = sync outage), an auth contract that hard-403s
   installs that lose their secret (T-020/T-028/T-059 — recovery now exists,
   but the failure mode was invisible for a day), and rate/size caps that
   only matter at hostile scale. We built solid infrastructure for a user
   who hasn't arrived yet.

3. **The release channel reaches the real user faster than our safety
   checks.** `apk-latest` auto-publishes on green CI, and "green CI" does
   not include a cold-launch smoke — so the 17:17 blurTarget build shipped a
   crash-loop to Anay's phone within minutes (three agents, including me,
   then raced installs on the one device; the crash also masked the wardrobe
   as "0 pieces"). The one-phone-one-owner rule (adopted in TEAM.md §10)
   fixes the race, but nothing yet gates the asset itself.

## 3. Pivot options (2–3) — what changes, effort, risk

- **(a) Ship "your data never leaves your phone" as the identity, and prove
  it with an export button.** One screen in Settings/Diagnostics: "Save my
  wardrobe" → writes the SQLite dump + a manifest of photo refs to a
  user-chosen location (share sheet). Effort: small (a dump + share
  action; photos already sit in app files). Risk: low; purely additive.
  This answers the strongest signal we have (data irreplaceability) and
  turns our offline-first architecture into a feature instead of a gap.

- **(b) Gate `apk-latest` on a cold-launch smoke before the release asset
  updates.** Minimum version: the android.yml job boots the APK on the
  emulator lane (or `aapt`+`am start`+logcat grep for FATAL JS exceptions
  on any ARM host) and only overwrites the asset when zero FATALs. Effort:
  small-medium (the lane exists; the emulator-on-CI path is flaky — the
  logcat-on-boot check is the pragmatic floor). Risk: low; slower releases
  by one build cycle — acceptable when the channel serves exactly one
  phone. (Complements Wren's runner/process proposal; mine is only the
  asset gate.)

- **(c) Freeze the worker feature surface for beta; keep it as a data
  collector, not a promise.** No new endpoints, no UI language about sync
  or accounts until a second real device exists. The learning loop already
  works locally; the worker's real beta job is absorbing outbox events
  (which it now does, idempotently, T-041). Effort: discipline, not code.
  Risk: none; avoids building for a hypothetical user (we did 3 migrations
  of schema for zero real rows).

## 4. Keep / kill / defer

- **Keep:** the offline-first engine + local learning loop (it works, proven
  by the uniqueness/A-B harness); corrections persistence + re-scan
  protection (T-008 — most user-critical invisible feature); the deploy
  runbook + migrate-with-code discipline; one-phone-one-owner; the worker
  hardening already shipped (it costs nothing at zero traffic and is ready
  for the second device).
- **Kill (as in: stop implying it):** cloud sync as a user-facing promise in
  any copy or roadmap — it does not exist for the real user today.
- **Defer:** Play Store / AAB distribution until the product review lands
  and Anay decides who beta is for; multi-device sync; any new server
  surface (photos backup toggle, account transfer) until there is a real
  second install.

## 5. One thing to test with a real user next

Give the phone (or a secondary install) to someone who is not Anay for one
weekend and test exactly two things: (1) do they ever notice or want the
cloud half — or is capture → tag-fix → Today the entire product for them
too? (2) at the end of the weekend, delete the app in front of them — the
reaction to losing the wardrobe is the cleanest possible signal for how
soon export/backup (pivot a) must ship.
