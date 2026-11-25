---
id: T-013
title: Capture batch loop — make the 3-minute setup real
status: done
owner: Wren
reviewer: Yves (confirmed by lead) · taste gate: Vesper
priority: critical
depends_on: []
files:
  - apps/mobile/src/app/(tabs)/capture.tsx
  - apps/mobile/src/components/ui.tsx
branch: Wren/T-013
updated_at: 2026-11-24T20:41Z
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
- [2026-11-24 20:10 UTC] review (Wren): built in isolated worktree, `Wren/T-013` @ 3d0ed3b (off main 475a401). (1) save() stays on capture — session count++, 1.6s "Added ✓" chip + saved-thumb flash, camera re-armed; (2) Progress bar "N added this session" (target 30, PLAN §5) in cam bar; (3) save failure → inline card with "Try saving again" retry (was invisible); (4) Retake above ScanLog; (5) "View wardrobe" text link (never forced); (6) kit additions in ui.tsx: Progress/AddedChip/TextLink. Verify: `tsc --noEmit` green; `expo lint` — my two files clean, 4 errors all pre-existing in index.tsx/onboarding.tsx (T-026 scope). No new deps, no new Expo APIs. Stamps before 20:01 logged ~19 min fast — clock corrected on chatboard; this line uses machine time.
- [2026-11-24 20:13 UTC] Yves review REQUEST CHANGES (3d0ed3b): stale `cameraReady` across CameraView remount — Capture tappable before new ref exists. Fixed (Wren): `setCameraReady(false)` on save-success AND Retake (same latent hole) — camera overlay + disabled Capture now cover the flash window until `onCameraReady`. @ c906918, tsc green. Re-review please; taste gate on copy still open (Vesper).
- [2026-11-24 20:15 UTC] taste gate (Vesper, on c906918): **APPROVE** — copy passes the stylish-friend test end to end: "Added ✓" flash honors "camera is all that matters"; "Try saving again" + inline save error honest; "View wardrobe" quiet exit never forced; "N added this session" progress = the spec'd session ring, delivered. Components token-consistent, TextLink gets hitSlop (a11y win). Two non-blocking notes: (1) SESSION_TARGET=30 hardcoded — later tie to onboarding wardrobe-size guess; (2) saveError surfaces raw errorText() — friendlier once T-024 structured logging lands. Merge when lead is ready.
- [2026-11-24 20:16 UTC] code review (Yves, re-review on c906918, relayed from chatboard): **APPROVE** — cameraReady reset on save-success + Retake; overlay/disabled Capture close the flash window. Both gates green; @Onyx merge-queue.
- [2026-11-24 20:41 UTC] reviewer merge (Yves, per TEAM §5.5): merged `Wren/T-013` @ c906918 into `main` as `6684f50`; engine 44 + worker 8 + 4-way typecheck green on the merge result. APK build `45483317907`. Done.
