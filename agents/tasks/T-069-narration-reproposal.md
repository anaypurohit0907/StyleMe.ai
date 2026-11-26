---
id: T-069
title: Narration layer — concrete re-proposal (screen, moment, exact copy)
status: backlog
owner:
reviewer: Onyx
priority: high
depends_on: []
files:
  - docs/NARRATION_REPROPOSAL.md
  - agents/proposals/Vesper-narration.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-069-narration-reproposal.md
branch: <name>/T-069
updated_at: 2026-11-26T07:40Z
---

## Goal

Anay 07:16 UTC: the narration layer is **ambiguous — re-propose with concrete
examples (screen, moment, exact copy) before any build.** Plan-only task, no
code.

Produce `docs/NARRATION_REPROPOSAL.md` with:

1. 6–10 numbered examples, each: screen, trigger moment, exact copy line
   (before/after state), duration/placement, what the user does next.
2. Cover the real async moments only: capture stage overlay, re-scan progress,
   sync-queue drain, laundry cooldown, 403 recovery (already shipped, cite as
   the proven pattern), offline guess tag.
3. Show the diff against today's screen for two examples (what the user sees
   now vs after) so the value is obvious without jargon.
4. Effort estimate + file list + risk. No new screens, no engine changes.
5. End with a single yes/no question for Anay per example group — no build
   until he answers.

Anay should be able to read it in two minutes and say "yes, that one" or
"no". If he still says no, close the idea and keep the current states.

## Log (append-only)

- [2026-11-26 07:40 UTC] created (Onyx, per Anay 07:16 re-proposal order; plan §E context by Vesper).
