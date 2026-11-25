---
id: T-054
title: Mask cleanup — keep the central garment component on patterned backgrounds
status: in-progress
owner: Yves
priority: high
depends_on: []
reviewer: Wren
files:
  - packages/engine/src/mask.ts
  - packages/engine/src/index.ts
  - packages/engine/tests/mask.test.ts
  - apps/mobile/src/lib/segment.ts
branch: Yves/T-054
updated_at: 2026-11-25T09:12Z
---

## Goal

U²-Net-p sometimes keeps background blobs from the graphic bedsheet, producing
portrait-shaped masks and wrong cutout bboxes. Add a pure, tested mask-cleanup
step before resize: threshold at 0.5, find 4-connected components, score by
area × center prior, keep the central garment component (plus a detached-part
allowance), zero the rest. Unit-test with synthetic masks; no model change.

Acceptance: unit tests cover center-vs-border selection, disconnected garment
parts, empty/tiny masks; mobile typecheck; cutout log reports kept-component
coverage/bbox. Device eval on a patterned flat-lay if phone available.

## Log (append-only)

- [2026-11-25 09:12 UTC] created + claimed (Yves), from Q-003/user report: flat-lay on graphic bedsheet, U²-Net mask picks background. Reviewer Wren.
- [2026-11-25 09:27 UTC] independent pre-review (Rei, T-029; Wren owns the approve): **APPROVE, no blocking findings** @ `85c2c3c`. `cleanMask` is O(width*height) BFS with a reused `Int32Array` queue (320² = 102k px, bounded, no allocation per pixel); labels are assigned after each component, the center-prior + border-penalty scoring is sound, and the tiny/whole-frame bail-outs return the original mask untouched. Integration normalizes to [0,1] before cleanup, logs `kept/primary/components`, and resizes the cleaned mask. Tests cover center-vs-border, larger border strip, detached sleeve, empty, whole-frame and sub-threshold. Non-blocking: detached parts must be ≥10% of primary area — thin straps/sleeves below that get dropped, so the device eval on the graphic-bedsheet flat-lay is the real gate; `queue` is allocated once per call (fine at 320², note if SEG_SIZE ever grows).
- [2026-11-25 09:32 UTC] code review (Wren, on `Yves/T-054` @ 6b9cd08): **APPROVE**. Verified beyond Rei's pass: BFS enqueue-marks (`-1`) prevent re-visit, post-pass stamps real labels so the keep-set filter is exact; scoring math re-derived (border blob must be ≳3× larger to beat an equal centered one — the intended prior); guards return the ORIGINAL mask object (identity-checked in tests) so cleanMask can never blank a valid capture; engine re-export minimal; segment.ts cleans the 320² normalized mask pre-resize with a scan-log line matching the existing format. Ran on the branch: engine 77/77 (6 new mask tests), worker 23/23, tsc ×4. Merge per §5.5 — gated on the mobile hold (@Onyx: lift when ready; T-054 + vision-v2 validate in one install when a device returns). Detached-parts <10% drop noted for the device eval.
