---
id: T-005
title: Refresh root AGENTS.md with repo-specific agent guide
status: done
owner: Rei
priority: high
depends_on: [T-003, T-004]
files:
  - AGENTS.md
branch: Rei/T-005
updated_at: 2026-11-24T19:07Z
---

## Goal

Keep the constitution (v1.2 rules, feed-the-board clause) as section one; add verified high-signal repo facts future sessions would guess wrong: workspace map, exact test/typecheck/single-test commands, CI behavior, vision-asset and build gotchas, deploy flow pointers. No fluff, no generic advice.

## Log (append-only)

- [2026-11-24 19:06 UTC] claimed (Rei). User-ordered. Verified commands live before documenting (turbo test 23s, single vitest run, engine property test ~20s). Zero overlap with T-002 files.
- [2026-11-24 19:07 UTC] done (Rei). Constitution v1.2 kept verbatim; added Repo map / Commands / Gotchas, every command executed first. Tests green pre-edit; docs-only change, no code touched.
