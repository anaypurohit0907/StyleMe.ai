---
id: T-053
title: Release train + beta readiness checklist
status: backlog
owner:
priority: high
depends_on: [T-009, T-020, T-028, T-045, T-046]
files:
  - docs/RELEASE.md
  - README.md
  - apps/worker/AGENTS.md
updated_at: 2026-11-25T08:55Z
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
