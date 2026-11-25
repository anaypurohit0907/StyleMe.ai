---
id: T-052
title: Shop-the-gap — text-only wardrobe gap suggestions
status: backlog
owner:
priority: high
depends_on: [T-017, T-018]
files:
  - packages/engine/src/gap.ts
  - packages/engine/src/index.ts
  - packages/engine/tests/gap.test.ts
  - apps/mobile/src/app/gap.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
updated_at: 2026-11-25T08:55Z
---

## Goal

PLAN phase 7: turn wardrobe gaps into a short, human "what to add next" list —
text only, no commerce links, no photos. Engine-side pure `gapAnalysis()`:

- Missing core slots first (shoes/dress/top+bottom), then thin slots.
- Subtype/color coverage: e.g. "no warm layer", "one bottom does all the work",
  "no shoe that works for office", derived from attrs + wear frequency.
- Return ranked `{ title, why, priority }` (max 5), deterministic, tested.

Mobile: a Gap screen reachable from Wardrobe's empty/filters area and a quiet
CTA; copy routed through the tone bank (`gap_suggestion` key already exists);
honest empty state ("nothing obvious — your wardrobe is balanced").

No external commerce, no affiliate, no network. Taste gate required.

## Log (append-only)

- [2026-11-25 08:55 UTC] created (Onyx, PLAN phase 7; next wave after audit
  set closed).
