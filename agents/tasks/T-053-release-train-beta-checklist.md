---
id: T-053
title: Release train + beta readiness checklist
status: done
owner: Viv
reviewer: Onyx
priority: high
depends_on: [T-009, T-020, T-028, T-045, T-046]
files:
  - docs/RELEASE.md
  - README.md
  - apps/worker/AGENTS.md
branch: Viv/T-053
updated_at: 2026-11-25T09:18Z
---

## Goal

One runbook for the next release window (PLAN phase 8 beta readiness):

1. Worker: pending D1 migrations (`0003` applied; `0004_learn_dedupe` + any
   later) → deploy → health/auth smoke. Deploy is **Anay-gated**; the doc
   records the exact order and commands, not an authorization.
2. Mobile: vision-v2 APK (arm64) build/install, emulator x86_64 lane (T-046),
   SecureStore keychain path (T-038), pullable `styleme.log` (T-036).
3. Beta gates: crash-free ≥99.5%, onboarding funnel points, 5 testers,
   2-week retention, Play internal testing steps.
4. Rollback: previous worker version + migration notes; APK release asset
   rollback; known 403 re-onboard path (T-028).

Docs only — no deploy, no code change. Verify every command in the doc
against the repo before committing.

## Log (append-only)

- [2026-11-25 08:55 UTC] created (Onyx, next wave after audit set closed;
  deploy + beta gates need one source of truth).
- [2026-11-25 09:04 UTC] claimed (Viv) per Onyx's assignment. Lead waives the
  T-046 gate for docs: the emulator section will carry the exact x86_64
  commands and mark its validation state as T-046-pending, not claim a device
  pass that has not happened. Branch `Viv/T-053` off current main; reviewer
  Onyx. Docs-only.
- [2026-11-25 09:16 UTC] status → review (`Viv/T-053` @ `8b088dd`, based on
  `main@ed49cc4`). `docs/RELEASE.md` added: pre-flight tests/lint; migration
  inventory (`0003` live, `0004` pending, additive rollback note); Anay-gated
  migrate→deploy→health/auth-smoke; arm64 APK install + pullable-log checks;
  x86_64 emulator lane explicitly marked T-046-pending with the exact commands;
  beta gates (crash-free 99.5%, funnel points, 5 testers, 2-week retention,
  Play internal/AAB gap); worker/APK/403 rollback; known gaps (no analytics, no
  AAB CI, no iOS lane, emulator pending). README status now says 71 engine/23
  worker and points at the runbook; worker AGENTS links it. Commands verified
  against package scripts/wrangler config/android.yml; docs-only. @Onyx review.
- [2026-11-25 09:18 UTC] lead review (Onyx, `Viv/T-053` → merge): **APPROVE**. Commands match package scripts/wrangler/gh workflow; migration inventory (`0004` pending), deploy order, rollback, beta gates and the AAB gap are accurate. Docs-only, no mobile files. T-053 done.
