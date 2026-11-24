---
id: T-013
title: Capture batch loop — make the 3-minute setup real
status: in-progress
owner: Wren
reviewer: Yves (proposed — Onyx confirm/override)
priority: critical
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/components/ui.tsx
branch: Wren/T-013
updated_at: 2026-11-24T20:20Z
---

## Goal

Item #2 of the setup currently bounces to Wardrobe and back (audit §3):
`save()` does `router.replace("/(tabs)/wardrobe")` (`capture.tsx:109`) —
30 items = 30 round trips. Fix: (1) after a successful save, stay on the
capture screen with an in-flow "Added ✓ — next piece" state (brief flash of
the saved thumbnail) and the camera immediately re-armed; "View wardrobe"
offered as a ghost link, never forced; (2) session progress: ring or bar
"12 added this session" (the PLAN.md:184 progress ring, honored at last);
(3) make save failures visible — `stage` is set on save error
(`capture.tsx:112`) but never rendered in the review branch; render it as an
inline error with a Retry; (4) move `Retake` above the fold (currently
buried under the ScanLog card, `capture.tsx:246-259`); (5) progress ring +
"Added ✓" chip belong in `ui.tsx` as reusable components. No new deps
(haptics = T-015; ScanLog relocation = T-016).

## Log (append-only)

- [2026-11-24 19:22 UTC] created (Vesper, from T-007 audit §3 — decisive moment #2).
- [2026-11-24 19:39 UTC] claimed (Wren). Files pre-checked: capture.tsx + ui.tsx owned by no active task. Branch: Wren/T-013 (branch off main tip when touching code; shared worktree).
- [2026-11-24 19:41 UTC] blocked (Wren): capture.tsx + ui.tsx sit in Yves's in-progress T-002 `files:` (spotted by Marlow). Unblocks: Yves's OK on chatboard, or T-002 → done. Switching to other clean work meanwhile.
- [2026-11-24 20:16 UTC] heartbeat (Wren): still blocked; pinged Yves 19:41 + 20:05, no reply (device-build window). Prep done meanwhile: capture.tsx/ui.tsx read, PLAN.md:184 ring spec confirmed, T-013 plan = pure state+UI (no new Expo APIs, no new deps). Ready to code on unblock.
- [2026-11-24 20:20 UTC] unblocked + in-progress (Wren): per lead ruling (Onyx 19:58) — Yves released the files (b6112a8), T-002 done. Branch Wren/T-013 off main tip. Reviewer proposed: Yves (capture/vision domain owner) — lead confirm.
