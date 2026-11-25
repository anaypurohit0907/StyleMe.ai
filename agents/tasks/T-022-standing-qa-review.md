---
id: T-022
title: Standing QA + taste review of tasks reaching review status
status: in-progress
owner: Vesper
priority: high
depends_on: []
files: []
updated_at: 2026-11-25T05:19Z
---

## Goal

User-ordered standing duty (session order: act as product QA/head with taste;
chatboard 19:15 UTC order: stay registered, cycle work, avoid stopping).
When any task moves to `review` (or its owner pings on chatboard): diff it
against docs/QUALITY.md — the taste rule (§7), the correctness list (§5),
and the task's own goal; check tests/typecheck per root AGENTS.md; append
findings to the task file Log under my name; approve by flipping `review` →
`done` only when the product got better, not just the code. Review-only:
never edit another task's code myself; blockers found → new backlog tasks.
`files:` stays empty — a reviewer touches coordination files only (task
files' Log sections are append-only by their owners' consent).

## Log (append-only)

- [2026-11-24 19:47 UTC] claimed (Vesper). Standing duty while board work lands; heartbeats via this file.
- [2026-11-24 19:31 UTC] clock correction: my 19:38–19:47 stamps ran ~20 min ahead of machine clock (Sable caught it). Stamps from `date -u` only from now on; T-007 done-stamp left as-is (done file, correcting line on chatboard instead).
- [2026-11-24 19:31 UTC] QA cycle 1: reviewed Yves' landed vision work (5bc3265, merged to main): alpha-aware tagging, opaque-bbox crop + white composite, alpha-gated color, top-3 prob logging, classifyUri plumbing removed. Verdict: approve — sound and taste-correct (kills grey-canvas bias that likely caused the 4-bottom/1-top/2-accessory scan). Notes: png.ts inflate only supports stored blocks (matches own encoder — fine); no unit test covers png.ts decode (worker/engine test pair can't); on-device verify still pending in T-002.
- [2026-11-24 19:31 UTC] Q-002 anomaly: user says (chatboard) they answered Q-002, but QUESTIONS.md shows no answer appended and no commit exists. Flagged on chatboard for re-post.
- [2026-11-24 19:41 UTC] QA cycle 2: user's Q-002 answer landed ("i tagged them correctly" + dataset-search order). Ran the search for T-023's future owner: verified ModaNet (55k street photos, eBay/modanet, COCO-style polygons) + Fashionpedia HF mirror as the two adds; posted findings as a Q-002 answer. Yves' follow-up (which grid state is truth — re-scan likely clobbered user's manual fixes) still needs the user.
- [2026-11-24 19:48 UTC] clock note: cycle-3 stamps (19:51/19:52) ran 3–4 min ahead — caught it myself this time via `date -u` before push. Discipline: `date -u` immediately before EVERY stamp.
- [2026-11-24 20:06 UTC] QA cycle 4 (first under charter): (a) absorbed TEAM.md + PROTOCOL §12 — QA/taste gate is now my chartered role, Onyx is lead; (b) T-012 taste-gate review posted to task log: REQUEST CHANGES (one round with lead's — recovery-card copy "Every option here breaks one of your rules.", hint reword, undo both-orders) + explicit TASTE APPROVE on badge labels / skip-line / greeting / reason copy; Wildcard↔exploredSignatures noted for T-021; (c) T-019 done (my approve → merged); (d) board: T-020 in progress (Indigo), T-013 unblocked + in progress (Wren), T-023 in review (Wren — reviewer unassigned, lead's call), T-025 brand pack in progress (Viv). No other reviews pending my gate.
- [2026-11-24 20:04 UTC] QA cycle 5: (a) T-023 static QA (Onyx-assigned): APPROVE — shipped-probe benchmarking, DF2 anchor + FPI gap-fill + Fashionpedia worn-proxy + ModaNet annotations-only w/ honest degrade; non-blocking ask: pin sampling seed for pre/post-T-009 comparability; (b) T-025 taste gate: APPROVE structurally (template assets gone — audit §4 item closed; provenance + vector master; app.json override drop correct); pixel sign-off = Onyx + user (my session has no image input); suggestion: rust fill in mark.svg master; (c) incident ownership: the e8a9a5a merge that dropped Indigo's 06f194e was mine — Wren's restore (ea6e575) verified; process fix adopted: after any merge, diff result against BOTH parents before pushing; (d) clock discipline: 3 strikes (19:41 batch, 19:52, 20:08) — now stamping only from `date -u` output in the same command as the write.
- [2026-11-24 19:51 UTC] QA cycle 3: (a) main↔origin divergence (duplicate Yves Q-002 commits ee1887c/d70fb85) — reconciled in temp worktree, QUESTIONS.md union-merged (my dataset answer + Yves' Q-003), pushed e8a9a5a; (b) T-019 (Indigo, 06f194e) reviewed: APPROVE — composite PK shadow-table migration (data-preserving, 0001 frozen, FK enforced), upsert conflict target `(user_id, id)`, MockD1 faithful ON CONFLICT, two-device isolation regression test; non-blocking notes: manual DROP garments_scoped on partial-failure rerun, commit stranded on Wren/T-006 (shared-worktree quirk) — cherry-pick at done-time; (c) protocol watch: Marlow caught T-013/T-002 file overlap before touching — correct; Wren honored the block. Team healthy: 10/10 names active, 4 tasks in flight, review discipline holding.
- [2026-11-24 20:03 UTC] clock strike 4 (20:06 vs 20:03): composed-stamp-before-check, again. Permanent fix: STAMP=$(date -u) substituted inside the same command as every future append — chatboard + task logs. T-022 self-governance.
- [2026-11-24 20:16 UTC] QA cycle 6: T-013 taste gate APPROVE @ c906918 (Wren's batch loop: all copy passes, two non-blocking notes logged in T-013). Q-003 answered by user via Indigo: flat-lay-on-purpose — Yves' preprocessing + T-013 coaching assumptions hold. Q-001 resolved (lead approves main PRs). Q-004 open (migration vs live worker deploy order — Indigo holding, user's call).
- [2026-11-24 20:31 UTC] QA cycle 7: rescoped own T-016 per T-031 split (dark mode unblocked from T-013 critical path — good call by the 11th session + Wren). Review queue: T-008 + T-013 both green but merge-stalled >20 min (lead SLA) — Yves pinged 20:27, escalation next cycle if unmoved. T-012 fixes still pending from Marlow. 0 OPEN questions. No new code to gate.
- [2026-11-24 20:45 UTC] QA cycle 8: T-013 merged + done (critical path clear — batch loop live on main, Yves merged per TEAM 5.5). T-008 now blocked (Yves; schema handoff dependency). T-031 claimed (Wren) — taste gate assigned to me at review time. T-012 stale 46 min → §9 ping posted to @Marlow; takeover window opens ~21:00 if silent. T-024 logging in progress. Queue otherwise healthy; 0 OPEN questions.
- [2026-11-24 21:01 UTC] QA cycle 9: T-031 taste gate APPROVE (semantic theme layer, accent constant, audit dark-values honored); fed T-032 for the four flat-color screens (depends T-008 for dna.tsx). T-012 takeover dispatched to lead (Rei/Coco suggested) — I recuse, gate conflict. Board current, 0 OPEN questions.
- [2026-11-24 21:15 UTC] QA cycle 10: T-012 re-verified post-takeover (Coco @ bea9b0e): taste APPROVE — all three review fixes in verbatim; decisive moment #3 (why-panel) functionally + taste complete, awaiting code re-review + merge. T-031 code review passed to Rei (Viv SLA-lapsed); my gate already cleared. T-026 (lint) claimed by Coco, T-020/T-024 in flight. 0 OPEN questions.
- [2026-11-25 02:49 UTC] QA cycle 11 (02:49 after 5.5h wake gap): queue jammed at merge step — Onyx/Rei/Viv/Yves/Indigo/Coco all 6h+ silent; T-012 + T-031 fully gate-cleared, unmergeable per TEAM 5.5. T-023 verified: seed ask already satisfied (SEED=0 at birth, 63cf36c queued), remaining = Yves Colab run. Opened Q-005 (lead succession — user-only call) + chatboard escalation. Automation horizon: my wake loop expires ~07:45 UTC; if user wants continuity past that, re-arm needed.
- [2026-11-25 05:03 UTC] QA cycle 12: wake loop re-armed — old automation (exp 07:30 UTC) deleted, replacement aut_2111635d4001lMRPZ0k6IY51KZ created, expires 17:03 UTC, prompt now self-re-arms near expiry. Queue state: T-012 code re-review in-flight (Wren verifying bec7678, silent since 02:56), T-031 code review w/ Coco (verdict pending), T-026 review (Rei), T-023 awaiting Yves Colab run, Q-005 still open with user. Sable watcher healthy. Nothing new at my gate.
- [2026-11-25 05:19 UTC] QA cycle 13: queue unjammed — T-012 (why-panel) + T-031 (dark mode) + T-024 (logging) all DONE + reviewer-merged (Wren/Coco executed TEAM 5.5 merges; Q-005 succession partially self-resolved, still open for lead confirmation). T-008 code-APPROVE (Wren 0464523), board flip pending Yves. T-011 (tone wiring) claimed by Coco — taste gate pre-spec posted (read-aloud test, no forced memes, one flavor per string, bank differentiation, honest intensity). Feeds noted: T-033, T-034.
