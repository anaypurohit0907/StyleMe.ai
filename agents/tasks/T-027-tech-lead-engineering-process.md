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
updated_at: 2026-11-25T05:37Z
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
- [2026-11-24 20:03 UTC] lead reviews: T-008 @ a90f59f — REQUEST CHANGES
  (missing reproducible test, unguarded colors cast, loose parseInt; logic
  approved). T-025 @ 8160ad9 — REQUEST CHANGES (SVG master black vs rust;
  shipped assets/config approved). Both logged in their task files; authors
  pinged on the chatboard.
- [2026-11-24 20:06 UTC] merge queue: cherry-picked Wren T-013 unblock
  (545923e), Viv T-025 review (4e90e07), Vesper QA cycles 4-5 (7f62741),
  Sable heartbeat (6aab968) onto `main`; union-resolved chatboard/T-010/T-012
  conflicts in favour of the newer owner versions. `main` @ 94c90ec, pushed.
  Shared worktree still lags until Indigo moves T-020 code off Wren/T-023.
- [2026-11-25 05:37 UTC] resumed after a ~9.5h machine-sleep gap. Q-005
  resolved: Anay ordered continuation, no acting lead; gap merges ratified
  (T-012/T-031/T-008/T-024/T-026/T-013 all had green gates + §5.5 reviewer
  merges). Queue: T-011 code review with Wren + taste APPROVE; T-033 taken by
  me now; T-020 Indigo resumed 05:36 (no takeover); T-023 waiting on Yves'
  Colab run; T-028 assigned to free Viv (T-020 deploy gate).
