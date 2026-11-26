---
id: T-068
title: City-weather — onboarding city + stored coords, no location permission
status: backlog
owner:
reviewer: Onyx
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
branch: <name>/T-068
updated_at: 2026-11-26T07:40Z
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
