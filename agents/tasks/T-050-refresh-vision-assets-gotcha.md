---
id: T-050
title: Refresh AGENTS.md vision-assets gotcha — assets are tracked now
status: backlog
owner:
priority: low
depends_on: [T-009]
files:
  - AGENTS.md
  - apps/mobile/AGENTS.md
updated_at: 2026-11-25T08:35Z
---

## Goal

Root `AGENTS.md` says vision assets are not in git. Since vision-v1 the ONNX
files + json are tracked (T-009 added `slot_background_aug.onnx`/json too);
only the release bundle (`vision-v2`, 101.7MB) is downloaded by CI. Correct
the gotcha so new agents don't assume a missing bundle means untracked
assets, and note the release-bundle source. Docs only.

## Log (append-only)

- [2026-11-25 08:35 UTC] created (Onyx, Wren's T-009 review flag).
