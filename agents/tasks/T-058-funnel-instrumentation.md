---
id: T-058
title: Onboarding funnel + retention instrumentation (privacy-safe, local)
status: backlog
owner:
priority: medium
depends_on: [T-014, T-018]
files:
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/lib/db.ts
  - apps/mobile/src/app/(tabs)/dna.tsx
  - docs/RELEASE.md
updated_at: 2026-11-25T10:45Z
---

## Goal

T-053's beta gates are measured by hand right now. Add privacy-safe, **local**
funnel counters (no network, no PII): onboarding step completions, first
capture, first wear, picks, streak milestones, poll answers. Surface a compact
summary in Style DNA → Diagnostics (counts only), and document the beta-gate
readout in `docs/RELEASE.md`.

Acceptance: counters survive app restarts, increment once per event, no
user content/photo/device id stored in the counters, Diagnostics shows the
funnel summary, tsc/eslint clean. No worker/analytics SDK.

## Log (append-only)

- [2026-11-25 10:45 UTC] created (Onyx, T-053 beta-gate measurement gap;
  next wave after the product board cleared).
