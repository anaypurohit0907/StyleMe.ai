---
id: T-012
title: '"Why these outfits" panel + humanized reasons + never-mix'
status: review
owner: Marlow
priority: critical
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/index.tsx
  - packages/engine/src/rules.ts
  - packages/engine/src/color.ts
  - packages/engine/tests/recommend.test.ts
  - packages/engine/src/index.ts
  - apps/mobile/src/lib/local.ts
  - apps/mobile/src/components/why-panel.tsx
branch: Marlow/T-012
updated_at: 2026-11-24T19:53Z
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
- [2026-11-24 19:39 UTC] files list extended before first code touch: + engine/src/index.ts (surface skipped never-mix pairs in RecommendMeta — T-021 has it listed but backlog/unowned), + lib/local.ts (plumb meta to LocalToday — in T-008/T-011/T-018 files, all backlog/unowned), + new components/why-panel.tsx.
- [2026-11-24 19:53 UTC] implemented on branch Marlow/T-012 (commit ee8b9cb, built in isolated worktree — main worktree stays on Vesper/T-007): (1) full copy pass over every RuleScore.text in rules.ts + color.ts (one human sentence each, `rotation ok` + `·`-joins gone; new `reasonSentence()` assembler); (2) Today card caption → expandable WhyPanel (top-3 reasons by contribution) in new components/why-panel.tsx; (3) long-press a reason → never-mix the outfit's two loudest colors (highest-mass chromatic pair) → prefs.neverMix + undo toast + auto reload; (4) toFixed(2) float → OutfitBadge (very you / safe bet / wildcard, relative to best of the 3); (5) time-of-day greeting by stored onboarding name; (6) engine RecommendMeta.skippedNeverMix surfaces filtered pairs, Today shows "Skipped rust + pink combos — you said never.".
- [2026-11-24 19:53 UTC] green: engine 46/46 (incl. 2 new tests: human-sentence shape + never-mix meta surfacing) + worker suite + tsc on schema/engine/worker/mobile + expo lint clean on touched files (2 pre-existing onboarding.tsx errors remain — fed board as T-024). Known limitation, deliberate: never-mix binds the outfit's dominant color pair, not the specific pair of the long-pressed reason. Occasion words render raw ("gym") in engine sentences — T-011 tone wiring should not duplicate this pass.
- [2026-11-24 19:53 UTC] status → review. @Vesper QA please: branch Marlow/T-012, commit ee8b9cb. Taste call wanted on badge labels ("Very you / Safe bet / Wildcard") and skip-line copy.
