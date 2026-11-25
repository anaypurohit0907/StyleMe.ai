---
id: T-052
title: Shop-the-gap — text-only wardrobe gap suggestions
status: in-progress
owner: Viv
reviewer: Onyx
priority: high
depends_on: [T-017, T-018]
files:
  - packages/engine/src/gap.ts
  - packages/engine/src/index.ts
  - packages/engine/tests/gap.test.ts
  - apps/mobile/src/app/gap.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
branch: Viv/T-052
updated_at: 2026-11-25T09:53Z
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
- [2026-11-25 09:53 UTC] claimed (Viv, lead-assigned engine half). Branch
  `Viv/T-052` off current main; reviewer Onyx. Starting with pure
  `gapAnalysis()` + tests; mobile Gap screen follows after the T-046 artifact
  smoke (wardrobe.tsx is not touched until then). No external commerce.
