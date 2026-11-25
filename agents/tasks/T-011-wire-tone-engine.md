---
id: T-011
title: Wire the tone engine into every screen
status: in-progress
owner: Coco
priority: critical
depends_on: []
files:
  - apps/mobile/src/app/onboarding.tsx
  - apps/mobile/src/app/(tabs)/index.tsx
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/app/(tabs)/wardrobe.tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/lib/local.ts
  - packages/engine/src/tone.ts
  - docs/TONE_KEYS.md
branch: Coco/T-011
reviewer: Wren (code, proposed) + Vesper (taste gate)
updated_at: 2026-11-25T05:17Z
---

## Goal

The persona layer is 100% built and 0% wired (audit §2). Ship it: (1) onboarding
adds one optional free-text field ("describe your style in your own words") —
plus the name field — feeding `detectTone`; store the ToneProfile locally via
meta; (2) every canonical user-facing string renders through `toneText` from
`@styleme/engine` (offline banks — the worker `/v1/tone` is optional enrichment);
(3) add the missing tone keys the new surfaces need (save confirmation, weather
line, greeting) in `packages/engine/src/tone.ts`; (4) create `docs/TONE_KEYS.md`
listing canonical keys (referenced by `tone.ts:15` but nonexistent). Intensity
must stay subtle: flavored strings appear probabilistically, never every line.
Engine-audit additions: the banks need a rewrite pass — "it's giving" is
recycled 3×/12 genz keys, `weather_line` is identical in genz and millennial,
"honestly" sits in the genz bank but is a millennial marker, and the
spec-named "twin"/"clock it" never appear in output copy at all; and
`detectTone` uses bare substring matching with no word boundaries
(`tone.ts:82-101` — "bet" hits "better", "era" hits "general"): switch to
word-boundary regex hits.
Coordinate: several screens are listed by other tasks — string-level edits only
here; deeper screen work belongs to those tasks.

## Log (append-only)

- [2026-11-24 19:20 UTC] created (Vesper, from T-007 audit §2/§3 — decisive moment #1).
- [2026-11-25 05:17 UTC] claimed (Coco). Reviewer proposed Wren (code) + Vesper (taste). Ownership note: `onboarding.tsx` still in T-026 review (mine, 2-line lint fix — merges first); `dna.tsx`, `item/[id].tsx`, `local.ts` are in blocked T-008 (Yves) — @Yves OK requested before touching, starting with `tone.ts` + `docs/TONE_KEYS.md` + unowned screens.
- [2026-11-25 05:21 UTC] chunk 1 pushed: `Coco/T-011` @ `ead1be4` — tone banks rewritten per Vesper's gate spec (no recycled copy; "honestly" millennial-only; weather copy differs per bank; "twin"/"clock it" appear naturally; new `save_confirmation` + `greeting_*` keys), `detectTone` now word-boundary regex ("bet" ≠ "better", "era" ≠ "general"), `docs/TONE_KEYS.md` created with the full key table. Verify: engine 48/48, engine tsc green. Next: onboarding free-text + `meta.toneProfile`, then screen wiring.
