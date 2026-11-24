---
id: T-027
title: Establish tech lead role + proper SWE team process
status: in-progress
owner: Onyx
priority: high
depends_on: []
files:
  - agents/TEAM.md
  - agents/PROTOCOL.md
  - AGENTS.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/README.md
  - agents/tasks/T-026-mobile-lint-hygiene.md
  - agents/tasks/T-027-tech-lead-engineering-process.md
branch: Onyx/T-027
updated_at: 2026-11-24T20:00Z
---

## Goal

User order: introduce a proper software-engineering team with a tech lead.
Make the team accountable and predictable without adding machinery beyond
markdown. Deliverables:

1. `agents/TEAM.md` — team charter: roles + decision rights, SDLC, Definition
   of Ready/Done, WIP limits, review rules, async ceremonies, escalation,
   branch/merge discipline, health metrics.
2. `PROTOCOL.md` — new §12 (tech lead + workflow) and small amendments:
   reviewer field, independent review before `done`, lead-owned merge order.
3. `AGENTS.md` — one non-negotiable pointing at the charter + review gate.
4. `agents/tasks/README.md` — `reviewer:` in the task template.
5. Board repair: duplicate `T-025` lint task renumbered `T-026`; board rows
   for T-025/T-026/T-027.
6. Claim the lead seat as **Onyx**; announce duties on the chatboard.

Lead duties: triage/priority order, assign reviewers, unblock or reassign,
own merge order, final technical call; does not write every task and never
self-approves own code. Domain owners are default reviewers, not exclusive
writers.

## Log (append-only)

- [2026-11-24 19:56 UTC] claimed (Onyx). User-ordered; PROTOCOL §1 says
  PROTOCOL.md is human-written — this edit is under the user's explicit order,
  noted here for audit. Duplicate T-025 → T-026 repaired before writing.
- [2026-11-24 19:58 UTC] main sync: cherry-picked the charter commit (ce0c0d7)
  and Sable's T-010 commit (c86235e) onto `main`; T-010 conflict resolved to
  Sable's newer file. Pushed `main` @ 8a19956. `main` now carries TEAM.md,
  PROTOCOL v1.2, AGENTS §12, README reviewer field, T-026 rename.
- [2026-11-24 19:59 UTC] reviewer assignments: T-012 → Onyx (code) + Vesper
  (taste gate); T-020 → Onyx; T-023 → Vesper (static QA). T-013 unblocked
  (Yves b6112a8, T-002 done) — Wren pinged to flip and build.
- [2026-11-24 19:59 UTC] first lead review: T-012 @ b35e9de — REQUEST CHANGES,
  one blocking empty-result dead-end after a never-mix rule filters every
  candidate (details in T-012 Log); rest approved. T-027 remains the standing
  lead-duty task (in-progress), not a one-off.
