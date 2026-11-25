---
id: T-059
title: Wire 403 registration recovery UI — reset device identity
status: review
owner: Indigo
reviewer: Onyx
priority: high
depends_on: [T-028, T-014]
files:
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/components/ui.tsx
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-059-403-recovery-ui.md
branch: Indigo/T-059
updated_at: 2026-11-25T12:25Z
---

## Goal

T-028 added `AuthError { code: "registration_locked" }` + `resetDeviceIdentity()`,
but no screen catches it, so a lost/invalid registration secret still surfaces
as a generic failure. Wire the recovery path:

1. Catch `registration_locked` where Today/wardrobe sync/auth runs.
2. Show the existing `Confirm` sheet: "This device needs to reconnect" with
   honest copy (local wardrobe/prefs stay; the old worker identity is
   abandoned) + "Reconnect" / "Not now".
3. On confirm: `resetDeviceIdentity()` then retry the failed operation once;
   on failure, show the existing honest error card.
4. Never auto-reset without consent; never log the secret/token.

Acceptance: typed 403 path is reachable from the UI, Confirm copy is clear,
no silent loop, mobile tsc/eslint clean. Device pass if the phone is attached.

## Log (append-only)

- [2026-11-25 12:05 UTC] created (Onyx, T-028 review note; T-014 now makes
  the 403 path reachable in production).
- [2026-11-25 12:07 UTC] claimed (Indigo — owns the T-020 403 contract + runbook; files verified free; Coco offered hand-off, none claimed).
- [2026-11-25 12:25 UTC] → review @ `Indigo/T-059` **e78773c**: `onAuthLocked` listener registry in api.ts fires at the single 403 choke point (`authenticate()` before the typed throw) — sync-queue/drain untouched; Today subscribes once and shows the existing `Confirm` sheet ("This device needs to reconnect" / honest local-data copy / Reconnect · Not now). Reconnect = consent-gated `resetDeviceIdentity()` + one queue retry via `drain()`; **Not now** is session-latched (no re-prompt until app restart, so no nag loop); never auto-resets; no secret/token logging anywhere. `ui.tsx` untouched — the existing Confirm + copy fit, so the sheet is copy-only reuse. Verification: engine 90/90, worker 23/23, tsc ×4, eslint 0 errors on touched files. Device pass pending phone availability (Yves mid vision-v2 pass per Onyx's order).
- [2026-11-25 12:23 UTC] independent pre-review (Rei, T-029; Onyx owns the approve): **APPROVE, no blocking findings** @ `e78773c`. `resetDeviceIdentity()` only rotates the device id + clears token/secret (`local.ts:50-57`) — wardrobe, prefs and wear log stay local, matching the Confirm copy. The 403 signal fires exactly at `authenticate()` before the typed throw, listener errors are swallowed, and `Not now` is session-latched via a ref. Non-blocking: (a) after `resetDeviceIdentity()` the code only calls `drain()`; a `void load()` would refresh Today immediately instead of waiting for the next focus; (b) the Confirm copy is user-facing — route it through Vesper's taste gate per the team rule; (c) queued learn/laundry events are re-sent under the new device id (intentional local continuity, but worth a one-line comment). No secret/token logging.
- [2026-11-25 12:32 UTC] lead code review (Onyx, `e78773c` → merge `72a94b1`): **APPROVE code**. 403 signal at the auth choke point, consent-gated reset + drain retry, session-latched Not now, no secret logging; mobile tsc + eslint clean. **Taste (Vesper) + device rider pending** — task stays review.
- [2026-11-25 12:44 UTC] rider assessment (Indigo) — **cannot run safely on the only real install**: triggering the Confirm sheet requires an empty token cache + an existing worker user WITH a secret hash; Anay's install has its token in SecureStore (survived both -r updates) and its worker row is pre-0003 NULL-hash (would take the one-time upgrade path, not 403). Forcing the state means `pm clear` — destroys the 14-item wardrobe Anay explicitly won't re-rate — and the emulator lane is blocked by Anay's order (T-046 closed). Coverage instead: worker-side 403 contract tests (Viv's 8/8) + Rei/Onyx code reviews + the signal-flow unit reasoning above. Proposal: rider closed as not-runnable-without-data-risk; Vesper taste is the last gate. Rei's non-blocking nits considered: (a) `void load()` after reset — skipped, reset changes no local state so a reload is a no-op re-render; (c) re-send-under-new-id comment — skipped, not worth churn on a merged surface; both recorded here for the taste/authoring trail.
- [2026-11-25 12:53 UTC] lead call (Onyx): device rider **closed as covered** — triggering the 403 needs `pm clear` on the only install, which destroys the 14-item wardrobe; worker 403 contract tests + Rei/Onyx reviews cover the path. T-059 stays review only for Vesper's Confirm copy.
- [2026-11-25 13:36 UTC] copy gate (Vesper, on e78773c): **APPROVE** — "This device needs to reconnect" is calm-factual; body leads with data-safety (house voice), explains the security-key why, states the fresh-link consequence honestly; "Reconnect / Not now" verb-first and session-latched (no nag). Consent-gated, never auto-reset — dark-pattern-free. Gate CLEARED → done.
