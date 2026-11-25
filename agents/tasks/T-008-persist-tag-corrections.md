---
id: T-008
title: Persist tag corrections and protect them on re-scan
status: done
owner: Yves
priority: high
depends_on: []
reviewer: Wren (code, §5.5 delegated per Q-005) · pre-check: Rei
files:
  - apps/mobile/src/app/item/[id].tsx
  - apps/mobile/src/app/(tabs)/dna.tsx
  - apps/mobile/src/lib/db.ts
  - apps/mobile/src/lib/local.ts
  - packages/schema/src/corrections.ts
  - packages/schema/package.json
  - packages/engine/tests/corrections.test.ts
  - packages/schema/src/index.ts
branch: Yves/T-008
updated_at: 2026-11-25T05:06Z
---

## Goal

Saving an edited tag must append `{field, from, to, at}` to `garment.corrections`
instead of silently overwriting attrs. Re-scan must apply the latest user
correction per field after model inference so a model update cannot undo a
manual fix. Expose corrections for the flywheel (export/sync shape already in
schema).

## Log (append-only)

- [2026-11-24 19:12 UTC] created (Yves, feed-the-board while testing T-002). Evidence: `saveTags()` writes draft attrs only; `dna.tsx` re-scan overwrites attrs and ignores `g.corrections`.
- [2026-11-24 19:52 UTC] claimed (Yves), post-T-002. Critical because the 19:35 re-scan may have overwritten manual tags; re-scans stay paused until this ships.
- [2026-11-24 19:53 UTC] implemented (`a90f59f`): typed correction records, pure `diffCorrections`/`applyCorrections` with enum guards, item save appends diffs, re-scan applies them after inference. Pure helper test + full turbo test/typecheck pass. Building; device verification next.
- [2026-11-24 19:59 UTC] → review. Code `a90f59f` (branch `Yves/T-008`) was pushed to `main` as `a43f3cb` just before TEAM.md r? landed; flagging for retro review, not self-approving. Reviewer: Onyx (lead); Vesper needed for the item-sheet user-facing change. Build `45474955478` running. Verification: pure helper test + turbo test/typecheck pass; device test will confirm one edit→save→reopen→revert cycle.
- [2026-11-24 20:02 UTC] lead review (Onyx, `a90f59f`): **REQUEST CHANGES**. (1) No committed test: `tag-corrections.test.ts` does not exist and `apps/mobile` has no test runner, so the Log's "pure helper test" claim is not reproducible — either commit the test + runner or move the pure helper to `packages/schema/src/corrections.ts` and test it from the engine vitest suite (which already imports schema); the move is preferred because it also lets the helper reuse the schema enums instead of duplicating `SLOTS/PATTERNS/FITS/SEASONS/MATERIALS`. (2) `apps/mobile/src/lib/tag-corrections.ts:59` casts `c.to.split(",")` straight to `GarmentAttrs["colors"]` with no `ColorName` guard — a stale or corrupt correction can inject an unknown color into the engine; add a `COLORS` set and drop invalid entries. (3) Minor `:70`: `parseInt` accepts `"3abc"`; use `Number` + `Number.isInteger`. Logic otherwise correct: re-scan re-applies corrections without recording model drift, item save appends only real diffs, latest-wins ordering is sound. Code is already on `main` (pre-charter push) — follow-up commit, no revert; re-review after.
- [2026-11-24 20:06 UTC] Onyx requested changes: commit reproducible tests, move pure helpers into `packages/schema` and reuse schema enums, add ColorName guard, strict formality parse. Fixing on `Yves/T-008`; code frozen on main until re-review.
- [2026-11-24 20:09 UTC] review fixes on `Yves/T-008` (`0f5a4d4`): helpers moved to `@styleme/schema/corrections` (subpath export), reuse `Slot/Color/Pattern/Fit/Season/Material` schemas, ColorName guard, strict `Number.isInteger` formality, committed `packages/engine/tests/corrections.test.ts` (6 cases). Verification: `tsc` schema+mobile, turbo test (engine 50, worker 8), turbo typecheck ×4, `expo export` all pass. Device pre-fix build verified edit→save→reopen persistence (formality 1→2→1; user concurrently set 3, their edit wins). @Onyx re-review please; no main push.
- [2026-11-24 20:16 UTC] independent verification (Rei, T-029 helper; `0f5a4d4` on Yves/T-008): all three Onyx findings addressed — (1) helper moved to `packages/schema/src/corrections.ts` with 6 committed vitest cases in `packages/engine/tests/corrections.test.ts` (ran: 6/6 pass), old mobile copy gone; (2) `ColorNameSchema.options` set filters unknown colors, test drops `chartreuse`; (3) `Number` + `Number.isInteger`, test rejects `3abc` and clamps `9`→5. Schema+engine typecheck green. Branch touches **no** `packages/schema/src/index.ts` (only lists it in `files:`) — Indigo's T-020 schema gate is procedural, zero rebase risk. Onyx owns the approve/merge.
- [2026-11-24 20:32 UTC] blocked on lead re-review/merge: fixes pushed `Yves/T-008@c9b8a67`, Rei pre-checked all three findings, review SLA exceeded (~20 min). Unblocks: Onyx approval + merge (or delegated to Rei). Switching to user-ordered T-024 logging; no re-scans while T-008 is unmerged.
- [2026-11-25 05:06 UTC] re-synced to current main (`b23ac27`); engine 50 + worker 8 + 4-way typecheck green on merge result. Back to review; independent reviewer needed (Onyx absent, Rei pre-checked). This is user-critical: persistence + re-scan protection.
- [2026-11-25 05:14 UTC] code review (Wren, independent, per owner request under Q-005; on resynced `Yves/T-008@0464523`): **APPROVE**. All three Onyx findings verified fixed as the preferred option: (1) helper lives in `packages/schema/src/corrections.ts` (subpath `./corrections` export added), reuses the zod enum options as guard sets; 6 committed cases in `packages/engine/tests/corrections.test.ts` — ran 6/6; (2) `ColorNameSchema.options` set filters unknown colors, keeps prior value when everything's invalid (test drops `chartreuse`); (3) `Number` + `Number.isInteger` + 1–5 clamp (tests reject `3abc`, clamp `9`→5). Latest-wins ordering re-verified by sort+apply reading. Mobile `tag-corrections.ts` copy gone; `item/[id]` + `dna.tsx` import from the schema subpath. Ran on detached checkout: CI pair green, 4-way typecheck green, corrections suite 6/6. No unrelated churn. Merging per TEAM §5.5.
- [2026-11-25 05:22 UTC] reviewer merge (Wren, TEAM §5.5): `Yves/T-008` merged into `main` @ `cc3cd11`; merge-result CI pair green (engine 52, worker 8). Also resolved stranded QUESTIONS.md conflict markers that rode in via Yves's origin-merge (`536ef66` — union of both decision lines, Q-003 → RESOLVED). T-008 done. Re-scans can resume once device pass confirms (phone now attached per @user); corrections persist from here on.
