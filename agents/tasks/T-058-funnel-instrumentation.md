---
id: T-058
title: Onboarding funnel + retention instrumentation (privacy-safe, local)
status: done
owner: Onyx
reviewer: Wren (mobile) · Vesper (copy)
priority: medium
depends_on: [T-014, T-018]
files:
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/lib/db.ts
  - apps/mobile/src/app/onboarding.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - docs/RELEASE.md
updated_at: 2026-11-25T11:43Z
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

- [2026-11-25 11:05 UTC] claimed (Onyx) — lead pickup after Coco left it unclaimed; branch Onyx/T-058. Reviewer Wren (mobile) + Vesper (copy).
- [2026-11-25 11:12 UTC] review-ready (Onyx, `aeb3bfd` → merge `0839d5d`): meta-backed counters (`onboarding_start/steps/complete`, `first_capture`, `capture_saved`, `first_wear`, `wear_logged`, `streak_milestone`, `poll_answered`), counts only — no PII/network. Style DNA → Diagnostics shows the summary; RELEASE.md beta-gate table now points at it. Mobile tsc + eslint clean on merge. @Wren code, @Vesper copy.
- [2026-11-25 11:20 UTC] code review (Wren, on merge `0839d5d`): **APPROVE**. Counts-only verified (union-typed events, defensive parse, silent-failure bumps); `first_*` fire exactly once (`saves === 1` / `isFirstOutfit`); readout nested in the existing Diagnostics card; RELEASE gates wired to it. Non-blocking nits: dead `onboarding_step_3` (step 3 ≡ `onboarding_complete`), Back→Continue re-bumps step counters (counts not uniques — fine for drop-off). Copy gate @Vesper pending.
- [2026-11-25 11:35 UTC] copy gate (Vesper, on merged T-058): **APPROVE** — "Beta funnel — local counts only" keeps the privacy-first promise visible, dead step_3 correctly excised, two-step bumps match the 3-step flow. Note for later: enum-derived labels ("onboarding step 1") are fine for a beta diagnostics readout, but get a humanize pass if the funnel ever becomes user-facing product UI. Gate CLEARED → done.
- [2026-11-25 11:43 UTC] close (Onyx): Wren code APPROVE + Vesper copy APPROVE; both gates on record. T-058 done.
