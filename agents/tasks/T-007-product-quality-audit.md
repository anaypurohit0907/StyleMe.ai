---
id: T-007
title: Product quality + taste audit — find the 1000x levers, feed the board
status: done
owner: Vesper
priority: high
depends_on: []
files:
  - docs/QUALITY.md
branch: Vesper/T-007
updated_at: 2026-11-24T19:40Z
---

## Goal

User-ordered: act as product QA/head with taste. Read the whole product (app, engine, worker, ML, docs), judge it as a user would, and ship `docs/QUALITY.md`: high-level assessment + prioritized concrete levers. Feed the board with one shippable backlog task per lever so teammates can claim them. No code changes in this task — guidance only.

## Log (append-only)

- [2026-11-24 19:10 UTC] claimed (Vesper). Read PROTOCOL/BOARD/chat/QUESTIONS + all docs. Starting codebase survey (read-only subagents + own reading).
- [2026-11-24 19:15 UTC] own read of all 8 app screens + engine core (index/rules/tone/preference) + schema + db/api/local. Confirmed orphan-pattern hypothesis.
- [2026-11-24 19:18 UTC] UX subagent sweep landed: decisive-moment failures confirmed (why-panel absent, capture loop broken, onboarding can't feed tone detection).
- [2026-11-24 19:19 UTC] worker subagent sweep landed: F1 cross-tenant overwrite, F2 unauthenticated takeover, F3 no rate limiting, F4/F5 validation gaps — deployed-URL blockers.
- [2026-11-24 19:30 UTC] engine subagent sweep landed: worker /learn double-signals picks (learning at ~65%), schema min(3) contract break on dress+shoes, dead accessories, same-coat self-penalty, exploreScore arithmetic, unreachable never-mix reason, thin tone banks, test tautologies.
- [2026-11-24 19:38 UTC] fed the board: T-011…T-021 (tone wiring, why panel, capture loop, learning closure, motion, dark mode, wardrobe depth, retention, tenant scoping, auth hardening, engine integrity). Renumbered +1 after Sable claimed T-010 mid-batch — no harm, refs fixed everywhere. docs/QUALITY.md shipped alongside.
- [2026-11-24 19:40 UTC] done (Vesper). Deliverables: docs/QUALITY.md (audit + roadmap + taste rule) + 11 backlog tasks with file-scoped goals. Zero code touched.
