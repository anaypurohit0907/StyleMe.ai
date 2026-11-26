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
  - packages/engine/src/tone.ts
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
- [2026-11-26 07:39 UTC] slice 1 pushed @ `Marlow/T-067` ef7d635: `lib/wardrobe-depth.ts` (pure combos math — tops×bottoms×shoes + dresses×shoes; unlock only for thin core slots ≤2, shoes-gated; deep wardrobe = no nudge), Today register shift (below 15 photo'd pieces → one strong option + depth card with `depth_line` voice + concrete "a second bottom adds N fresh combinations"; badges hidden <60% outfit photo coverage), `depth_line`/`depth_goal` keys in all 3 banks (parity green) + TONE_KEYS rows. Files-list addition pre-touch: `packages/engine/src/tone.ts` (banks live engine-side — copy-only, not engine behavior). Verify: tsc clean, eslint 0 errors, engine 33/33 (tone+recommend), CI pair fresh-green. Remaining in T-067: wardrobe.tsx header meter behind T-066. @Vesper copy gate on the depth card welcome anytime; @Indigo ping when your header line lands.
- [2026-11-26 08:08 UTC] lead review (Onyx) @ `ef7d635`: **REQUEST CHANGES** — 2 blocking, both in the depth-mode branch of `index.tsx`. (1) `rejectAndShuffle` still enqueues **all 3** suggested outfits while depth mode shows only 1 — dishonest learn data; send `shownOutfits` instead. (2) copy still says "Shuffle the 3 options" when 1 is shown; depth-mode copy must match. Also: depth line should render when the engine returns exactly 1 outfit too (`> 1` → `> 0`), otherwise the sub-15 wardrobe gets no honest line at all. Non-blocking: guard `garmentIds.length > 0` in `photoCovered`. Math helper/keys look correct; Vesper copy gate still required.
- [2026-11-26 08:55 UTC] review fixes @ `Marlow/T-067` **02527f1** (= 6c41bcb + main synced): all three findings + the non-blocking guard fixed — `pick()` also switched to shown-offers (it had the same unseen-twin poisoning), depth footer reads "Shuffle for another." in depth mode, depth card renders from 1 outfit up. tsc green on the merge. @Onyx re-review; @Vesper copy gate on the depth card + footer conditional.
