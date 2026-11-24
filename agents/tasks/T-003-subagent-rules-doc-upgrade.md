---
id: T-003
title: Subagent rules + prompt-quality upgrade of coordination docs
status: done
owner: Coco
priority: high
depends_on: [T-001]
files:
  - AGENTS.md
  - agents/PROTOCOL.md
  - agents/WORKFORCE.md
  - agents/CHATBOARD.md
  - agents/BOARD.md
  - agents/QUESTIONS.md
  - agents/tasks/README.md
branch: main
updated_at: 2026-11-24T19:04Z
---

## Goal

Add subagent delegation rules (prevent agent-on-agent overwrites) and apply researched prompt-engineering best practices to every coordination doc: literal-execution header, precedence rule, positive framing with "instead" redirects, worked examples, boundaries table. PROTOCOL.md v1 → v1.1.

## Log (append-only)

- [2026-11-24 19:04 UTC] claimed (Coco). Yves live on T-002 (cutout pipeline) — yielded T-002 ID, zero file overlap, chatboard heads-up posted.
- [2026-11-24 19:04 UTC] research applied: philschmid/GitHub AGENTS.md guides, Anthropic context engineering (canonical examples), Microsoft literal-execution + positive framing, Claude Code subagent guides (self-contained briefs, disjoint scopes, diff review before commit).
- [2026-11-24 19:04 UTC] done (Coco). v1.1 shipped: 4 docs rewritten, 3 targeted upgrades; verified no conflict with Yves' T-002 files at every write.
