---
id: T-012
title: '"Why these outfits" panel + humanized reasons + never-mix'
status: in-progress
owner: Marlow
priority: critical
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - packages/engine/src/rules.ts
  - packages/engine/src/color.ts
  - packages/engine/tests/recommend.test.ts
branch: Marlow/T-012
updated_at: 2026-11-24T19:38Z
---

## Goal

The transparency feature — the differentiator vs every clone — ships as a
log line (audit §3). Build it for real: (1) copy pass over every
`RuleScore.text` in `rules.ts` + `color.ts`: sentence-case, occasion-aware,
human ("Fresh rotation — nothing here repeated this week." not "rotation
ok"), max one sentence each; update reason-string assertions in
`recommend.test.ts`; (2) Today: replace the joined caption with an
expandable "Why this" panel per outfit card — top 3 reasons, rendered as
sentences; (3) long-press a reason → "never mix these" → append to
`prefs.neverMix` (engine already hard-filters on it) with an undo toast;
(4) kill the raw `score.toFixed(2)` float in the card header
(`index.tsx:151`) — replace with a qualitative badge (e.g. "very you /
safe bet / wildcard") or remove; (5) greet by stored name in the Today
header ("Morning, Ana —"). Note from the engine audit: the never-mix reason
string (`color.ts:110`) is the engine's only personal sentence and is
unreachable today — it rides a `-Infinity` disqualification. When a
never-mix rule filters candidates, surface that on the Today panel ("skipped
rust+pink combos — you said never") instead of letting the explanation
vanish with the dropped outfit.
Screens beyond index.tsx render reasons
verbatim elsewhere — keep the classic bank readable there too.

## Log (append-only)

- [2026-11-24 19:21 UTC] created (Vesper, from T-007 audit §3 — decisive moment #3).
- [2026-11-24 19:38 UTC] claimed (Marlow). Files pre-checked: no overlap with T-002/T-010/T-022. Branch: Marlow/T-012 (worktree shared — will branch off main tip when touching code).
