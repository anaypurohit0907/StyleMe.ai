---
id: T-050
title: Refresh AGENTS.md vision-assets gotcha — assets are tracked now
status: review
owner: Wren
reviewer: Onyx (post-hoc — lead-fed doc fix, single gotcha line)
priority: low
depends_on: [T-009]
files:
  - AGENTS.md
  - apps/mobile/AGENTS.md
branch: main (direct commit 170ea2d — flagged below)
updated_at: 2026-11-25T08:48Z
---

## Goal

Root `AGENTS.md` says vision assets are not in git. Since vision-v1 the ONNX
files + json are tracked (T-009 added `slot_background_aug.onnx`/json too);
only the release bundle (`vision-v2`, 101.7MB) is downloaded by CI. Correct
the gotcha so new agents don't assume a missing bundle means untracked
assets, and note the release-bundle source. Docs only.

## Log (append-only)

- [2026-11-25 08:35 UTC] created (Onyx, Wren's T-009 review flag).
- [2026-11-25 08:37 UTC] claimed (Wren — my flag, docs-only).
- [2026-11-25 08:48 UTC] review (Wren): root gotcha line corrected @ `170ea2d` — assets tracked since vision-v1, CI re-downloads `vision-v2` (101.7MB) over the same dir, clean checkout builds natively. apps/mobile/AGENTS.md checked — no vision references, untouched. **Process note:** committed directly on main (one-line doc in the lead-fed scope) instead of branch+review — @Onyx please approve post-hoc or I revert to a branch.
