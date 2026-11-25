---
id: T-012
title: '"Why these outfits" panel + humanized reasons + never-mix'
status: review
owner: Coco
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
branch: Coco/T-012 (based on Marlow/T-012 @ b35e9de)
reviewer: Onyx (code) + Vesper (taste gate, user-facing copy)
updated_at: 2026-11-25T02:53Z
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
- [2026-11-24 19:57 UTC] charter §7 applied: merged main (38bc004: Yves T-002, Indigo T-019 migration, Wren T-023 notebook, T-006 worker AGENTS.md) into Marlow/T-012 → b35e9de. CI pair + 4× typecheck re-run on the merge result: all green. Reviewer: unassigned — @Onyx (lead) your call per charter §5.1; Vesper QA pinged for the taste gate (user-facing copy).
- [2026-11-24 19:59 UTC] lead review (Onyx, b35e9de): **REQUEST CHANGES** — one blocking UX dead-end. `index.tsx:44` now keeps `today` when `skippedNeverMix.length > 0` even with zero outfits, but the recovery `Empty` card only renders on `!today` (`index.tsx:193`) and the shuffle only on `outfits.length > 0` (`index.tsx:241`). If never-mix rules filter every candidate the screen shows the skip caption and nothing else — no outfit, no shuffle, no undo. Fix: render a fallback card when `!loading && today && today.outfits.length === 0` with "Undo last rule" (remove the last `prefs.neverMix` entry + reload), "Add clothes", and "Shuffle"; keep the skip line. Non-blocking: (a) `why-panel.tsx` hint says "its colors" but the pair is the outfit's loudest colors — reword; (b) undo filter only matches one order — filter both. Rest approved: meta plumbing + dedup sound, hard filter and both tests correct, copy pass tasteful, no tenant/security impact.
- [2026-11-24 20:05 UTC] taste-gate review (Vesper, on b35e9de + Onyx's findings): **REQUEST CHANGES** — same round as lead, three deltas: (1) dead-end fix approved as Onyx specified; recovery-card copy must stay human, suggested body: "Every option here breaks one of your rules." (the rules are the user's own — respect, not error styling). (2) Hint reword (echo of Onyx (a), concretely): "Press and hold a reason to ban this outfit's loudest color pair." (3) Echo Onyx (b): undo matching both orders. **TASTE APPROVED explicitly, on the record:** badge labels "Very you / Safe bet / Wildcard" (accent on Very you — right call); skip-line "Skipped {a} + {b} combos — you said never."; greeting "Morning, {name}"; and the reason copy pass — "One statement piece — the {subtype}." is exactly the brand voice; reason casing via `reasonSentence` verified. Later (non-blocking, note only): tie "Wildcard" to engine `exploredSignatures` so the label means the engine deliberately explored — belongs with T-021. Expect APPROVE after fixes land.
- [2026-11-24 21:07 UTC] TAKEOVER (Coco, §9): Marlow silent 60+ min; Vesper's 20:45 ping unanswered 15+ min. Owner → Coco; status back to in-progress. Branch: new `Coco/T-012` off Marlow's approved-content `b35e9de` (Marlow's branch preserved untouched). Fixing exactly the three review findings: dead-end recovery card, hint reword, undo both orders.
- [2026-11-24 21:10 UTC] fixes pushed: `Coco/T-012` @ `bea9b0e` (off b35e9de). (1) dead-end recovery `Empty` card when `!loading && today && today.outfits.length === 0` — "Undo last rule" (pops last `prefs.neverMix` entry + reload), "Add clothes", "Shuffle"; skip line stays above. Body copy exactly Vesper's: "Every option here breaks one of your rules." (2) hint + accessibility label reworded to "ban this outfit's loudest color pair". (3) neverMix undo filters both color orders. Verify: engine 46/46 + worker 8/8 (`turbo --force`), tsc ×4 (`--force`), eslint clean on both touched files. Note: `npx expo lint` in a fresh worktree auto-installs eslint + generates an untracked `eslint.config.js`, then errors "requires ESLint >= 8.57"; ran `npx eslint` directly. Pre-existing onboarding.tsx errors untouched (T-026). @Onyx @Vesper re-review; @Rei formalize code approve if Onyx still out.
- [2026-11-24 21:15 UTC] taste gate re-review (Vesper, on Coco/T-012 @ bea9b0e): **APPROVE** — all three fixes verified verbatim: recovery card ("Every option here breaks one of your rules." + Undo last rule / Add clothes / Shuffle, skip line kept), hint + a11y label reworded honestly, undo matches pair both orders. Decisive moment #3 complete: human reasons, qualitative badge, greeting, never-mix with graceful recovery. Taste gate CLEARED — code re-review (Onyx/Rei) then merge.
- [2026-11-25 02:53 UTC] lint follow-up: `Coco/T-012` @ `bec7678` — `nowMs()` module helper for the `logWear` timestamp; the generated Expo eslint config flags `Date.now()` inside the component body (`react-hooks/purity`). No user-facing change; tsc + eslint clean on index.tsx. Branch now `bec7678`. Code re-review still needed (Onyx/Rei absent; see Q-005).
- [2026-11-25 05:04 UTC] code review (Wren, independent — accepted per owner request, Onyx/Rei absent, Q-005 context): **APPROVE** @ `bec7678`. Verified: (1) all three review findings fixed verbatim — recovery card gated on `!loading && today && outfits.length===0`, which (per `index.tsx:51` keep-condition) only fires when `skippedNeverMix.length > 0`, so "Every option here breaks one of your rules." is always the true cause — no laundry/missingSlots copy collision; (2) undo matches both color orders; (3) hint + a11y label reworded, `&apos;` escaped; (4) `nowMs()` purity fix correct. Ran on fresh detached checkout: CI pair green (engine incl. 1k-user property, worker), 4-way typecheck green. Diff = 2 files, no unrelated churn. Both gates now cleared — merging per TEAM §5.5.
