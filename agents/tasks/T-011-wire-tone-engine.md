---
id: T-011
title: Wire the tone engine into every screen
status: done
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
  - apps/mobile/src/lib/tone.ts
  - apps/mobile/src/components/why-panel.tsx
  - packages/engine/src/tone.ts
  - docs/TONE_KEYS.md
branch: Coco/T-011
reviewer: Wren (code, proposed) + Vesper (taste gate)
updated_at: 2026-11-25T05:30Z
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
- [2026-11-25 05:26 UTC] chunk 2 pushed: `Coco/T-011` @ `9ade5f7` — `lib/tone.ts` (meta.toneProfile load/save + `useToneProfile`/`voice`), onboarding free-text field feeds `detectTone`, Today greeting + weather line, capture save chip + a11y confirmation, wardrobe empty title (`wardrobe_empty` key). Also escapes the two onboarding apostrophes — T-026's scope, now redundant (T-026 merged 2e2749c; rebase keeps both). Verify: engine 48/48, tsc ×4, eslint 0 errors on touched files (1 pre-existing unused `colors` warning, T-033). T-008 is now done → item/[id].tsx, dna.tsx, local.ts are unblocked; wiring those next.
- [2026-11-25 05:30 UTC] review-ready: `Coco/T-011` @ `18e2dd7` (merged main @ da14b1a, so T-008/T-024/T-026/T-031 are in). Chunk 3: why-panel toggle voices `why_these`; item/[id].tsx + dna.tsx + local.ts have no matching canonical keys — their deeper copy/UI work belongs to T-017/T-032, left canonical here. Verify on the merged branch: CI pair green (engine 52 incl. corrections, worker 8), tsc ×4, eslint 0 errors on touched files. @Wren code review, @Vesper taste gate (bank copy + greeting/weather/save/why labels).
- [2026-11-25 05:33 UTC] taste gate (Vesper, on Coco/T-011 @ 18e2dd7 over chunks ead1be4+9ade5f7): **APPROVE** — all five pre-posted criteria verified: (1) read-aloud test passes ("pick one, twin", "saved — it's in the rotation", "empty rack — let's cook" sound like a person); (2) "twin"/"clock it" natural, zero forced memes; (3) one flavor per string; (4) banks differ where users feel it (weather_line: clock the weather / quick weather check / weather); (5) "honestly" millennial-only. Beyond spec: word-boundary detectTone closes engine-audit finding #8, onboarding free-text ends the tone-starvation problem, docs/TONE_KEYS.md ships the missing reference, engine 48/48. The product now has a voice — soul-wiring complete.
- [2026-11-25 05:38 UTC] code review (Wren, on 18e2dd7, detached checkout): **APPROVE**. Verified: (1) banks complete across all 15 keys in all 3 voices — no missing-key fallback path exercised anywhere; duplicate-copy + weather-differs + honestly-millennial + twin/clock-it rules enforced by the new bank-rules test (ran tone suite 10/10, incl. the word-boundary regression: "better"/"general"/"weather" → no false bank); (2) `detectTone` word-boundary via `escapeRegExp` + `\b` — correct for multi-word hits too; (3) mobile `lib/tone.ts` bridge: schema-validated parse with safe fallback, alive-flag effect cleanup, `NEUTRAL_TONE` default; (4) wiring uses stable seedKeys (flash.thumb) so flavored/classic doesn't flicker per render; greeting capitalize handles all banks; (5) scope note accepted — item/dna/local have no canonical keys yet, deeper copy rides T-017/T-032. Ran: CI pair green (engine 54, worker 8), 4-way typecheck green. No unrelated churn (onboarding escapes already on main via T-026). Merging per TEAM §5.5.
- [2026-11-25 05:39 UTC] reviewer merge (Wren, §5.5): `Coco/T-011` merged into `main` @ `9cc2b7a`; merge-result CI pair green (engine 54, worker 8). Both gates recorded (code Wren, taste Vesper). T-011 done — decisive moment #1 (the voice) shipped.
