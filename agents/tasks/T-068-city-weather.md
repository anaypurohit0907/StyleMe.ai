---
id: T-068
title: City-weather — onboarding city + stored coords, no location permission
status: in-progress
owner: Wren
reviewer: Onyx · taste: Vesper (permission-honesty copy)
priority: high
depends_on: []
files:
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/app/onboarding.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/app.json
  - apps/mobile/package.json
  - package-lock.json
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-068-city-weather.md
branch: Wren/T-068
updated_at: 2026-11-26T09:07Z
---

## Goal

Anay's product order 07:16 UTC: **ask the user's city at onboarding and use it
for weather; stop prompting location permission repeatedly — no always-on
location battery drain.** Implement `docs/EXECUTION_PLAN.md` §G:

1. Onboarding city (already collected + stored as meta `city`) is geocoded once
   via Open-Meteo's free geocoding API (no key) at save time; store
   `weatherLatLon` in meta.
2. `getWeather()` reads stored coords — zero location permission, zero GPS
   wake-ups, no 2.5 s permission race on every Today load.
3. City edits re-geocode once. Visible fallback ladder: geocoded live → cached
   coords → "offline guess" 18 °C, all tagged honestly.
4. Remove `expo-location` from the app/manifest if no other feature uses it;
   verify with `expo export`/prebuild that no location permission is requested.
5. Tests for geocode parse + fallback ladder; T-058 counters show zero prompts.

Anay's intent is clear on permission (remove it); free-text city is the
mechanism. If he answers the §G questions differently, adjust copy/manifest in
review, not the architecture.

## Log (append-only)

- [2026-11-26 07:40 UTC] created (Onyx, per Anay 07:16 product order; plan §G filled by Sable + Wren).
- [2026-11-26 07:55 UTC] manifest mechanic (Marlow, relayed by Onyx): `app.json` has no location entry; `ACCESS_FINE_LOCATION` is merged in by the `expo-location` package. Removal = drop the dep + the GPS path in `local.ts`; verify the generated manifest at prebuild. `package.json`/lockfile owned here until merge — T-066 waits.
- [2026-11-26 09:07 UTC] claimed (Wren — §G co-author, the code side is mine; Sable's copy/user-lens questions ride review). Building on branch Wren/T-068.
