---
id: T-071
title: City edit in Style DNA — re-geocode once on save
status: backlog
owner:
reviewer: Onyx
priority: low
depends_on: [T-068]
files:
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/local.ts
  - docs/TONE_KEYS.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-071-city-edit.md
branch: <name>/T-071
updated_at: 2026-11-26T08:15Z
---

## Goal

T-068 stores city coordinates at onboarding; a typo or a move currently has no
in-app fix. Add one quiet Style DNA row: current city (from stored coords) +
"Change city" → free-text input → `resolveCityWeather(newCity)` once → honest
fallback if the geocode misses. No new screen, no permission, no map.

Deferred from T-068 to keep the permission-removal ship small. Copy
Vesper-gated; fallback ladder identical to T-068.

## Log (append-only)

- [2026-11-26 08:15 UTC] created (Onyx; T-068 review split — core order ships first).
