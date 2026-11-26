---
id: T-067
title: Wardrobe-depth activation — health meter + honest depth line
status: in-progress
owner: Marlow
reviewer: Onyx
priority: medium
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/lib/wardrobe-depth.ts
  - apps/mobile/src/lib/tone.ts
  - docs/TONE_KEYS.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-067-wardrobe-depth-activation.md
branch: Marlow/T-067
updated_at: 2026-11-26T07:47Z
---

## Goal

Anay approved 07:16 UTC: **"wardrobe-depth activation (add to the todo list)"**.
Implement `docs/EXECUTION_PLAN.md` §F — mobile-only, zero engine/worker/schema
changes:

1. Wardrobe header: `Progress` ring toward the T-030 size guess + one gap line
   ("18 of ~30 · 3 more bottoms → 6 fresh combinations"). Arithmetic on the
   local garment list; label **combinations**, never "looks".
2. Today depth line below 15 photo'd pieces: 1 strong option + honest depth
   line instead of 3 near-twins; hide badges when photo coverage < 60%.
3. Two tone-bank keys (`depth_line`, `depth_goal`), Vesper-gated.

Needs Anay's picks (plan §F): goal framing, meter placement, pressure ceiling.
Default if he stays silent: his size guess as target, Wardrobe-only meter, quiet
tone (no homework pressure). Keep it additive and reversible.

## Log (append-only)

- [2026-11-26 07:40 UTC] created (Onyx, per Anay 07:16 approval; plan §F filled by Marlow).
- [2026-11-26 07:47 UTC] claimed (Marlow, plan §F author). Files-list change, pre-touch: `lib/local.ts` → NEW `lib/wardrobe-depth.ts` (standalone helper — keeps zero overlap with Wren's in-flight T-068 getWeather rewrite in local.ts). Build slicing per lead's export-first order: tone keys + depth math + index.tsx register shift NOW; the `wardrobe.tsx` meter lands AFTER Indigo's T-066 export line (same header file) or with his OK. Anay's defaults applied: size-guess target, Wardrobe-only meter placement, quiet tone.
