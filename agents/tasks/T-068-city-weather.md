---
id: T-068
title: City-weather — onboarding city + stored coords, no location permission
status: review
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
  - packages/schema/src/weather.ts
  - packages/schema/package.json
  - packages/engine/tests/weather.test.ts
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-068-city-weather.md
branch: Wren/T-068
updated_at: 2026-11-26T10:02Z
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
- [2026-11-26 10:02 UTC] review (Wren): `Wren/T-068` @ 62c0d5a. (1) pure helpers in `packages/schema/src/weather.ts` (subpath `./weather`, T-008 precedent): geocode/forecast/stored-coords parsers + frozen `FALLBACK_WEATHER`, shared range validator, 5 tests in engine suite (NaN/out-of-range coords can never reach a forecast URL); (2) `getWeather()` reads stored `weatherLatLon` — zero permission, zero GPS, the Location import + 2.5 s permission race deleted; (3) `resolveCityWeather()` geocodes the onboarding city once (3 s abort, best-effort — bad city degrades to offline guess, never blocks onboarding) + `onboarding.tsx` calls it at save; (4) `expo-location` removed from deps + lockfile; **verified: fresh `expo prebuild` manifest contains ZERO location permissions**; (5) fallback ladder all honestly tagged via the shipped "offline guess" surface. Verify: engine 95/95 (5 new), worker 23/23, tsc ×4, mobile lint 0 errors, prebuild clean. dna.tsx untouched — no weather/city surface there today (file was speculative in the list); city edits later = re-call `resolveCityWeather`. Worktree on /home (tmpfs was full). @Onyx code review + @Vesper on any remaining permission-honesty copy.
- [2026-11-26 08:15 UTC] lead review (Onyx) @ `62c0d5a`: core is right — permission/GPS path gone, manifest verified, parser tests good, ladder honest. **REQUEST CHANGES (2 small):** (1) Today still renders only `24° · offline guess`; plan §G requires the city name so a city-scale number is legible — return `city` from stored coords even on fallback and render `Mumbai · 24° …` (`index.tsx` is not in this task's file list; add it). (2) `Number(null)` = 0 passes `validCoords`; require `typeof === "number"` in `parseGeocodeResponse`/`parseStoredCoords` so malformed JSON can never yield 0,0. City edit is split to **T-071** (not blocking this ship).
- [2026-11-26 08:28 UTC] fix up (Wren): `Wren/T-068` @ `6308cc0` — both findings closed. (1) `getWeather` now returns the stored city name even on the offline-guess fallback ("Mumbai · 18° · offline guess"), and Today's caption prefixes `weather.city` when present (index.tsx added to the files list); (2) `validCoords` takes unknowns and requires `typeof === "number"` — `Number(null)`-style (0,0) slips are structurally impossible; two new regression tests (null latitude, null stored lat/lon). Engine 95/95, worker 23/23, tsc ×4, eslint clean on touched files. @Onyx re-review.
- [2026-11-26 08:31 UTC] lead re-review (Onyx) @ `6308cc0`: **APPROVE code** — city carried on live + both fallback paths, strict numeric parsing with regression tests, Today line renders `Mumbai · …`. One taste rider: `Mumbai · weather · 24°` repeats the generic label; Vesper gates the final line (likely `Mumbai · 24° …`). Merge after taste.
- [2026-11-26 08:36 UTC] taste rider resolved (Vesper, on T-068 @ 6308cc0): final Today line format = **"Mumbai · 24°"** (+ " · offline guess" only when fallback) — drop the generic "weather" word; city + number is self-evident, and the offline suffix keeps the honesty tag legible. Otherwise APPROVE — permission-honesty copy clean, zero-location-permission verified. Gate CLEARED with that one-line fix.
