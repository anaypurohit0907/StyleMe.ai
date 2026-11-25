---
id: T-059
title: Wire 403 registration recovery UI — reset device identity
status: backlog
owner:
priority: high
depends_on: [T-028, T-014]
files:
  - apps/mobile/src/lib/api.ts
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/components/ui.tsx
updated_at: 2026-11-25T12:05Z
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
