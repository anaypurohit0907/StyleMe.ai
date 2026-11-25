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
