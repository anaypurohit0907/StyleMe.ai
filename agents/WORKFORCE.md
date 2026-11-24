# Workforce — Agent Identities

10 slots. One name = one agent session. Claim at session start, release at session end.

## Rules

- **Claim:** set your row `Status: ACTIVE`, `Since: <now UTC>`. `Task` fills in when you claim work.
  Example: `| Yves | FREE | — | — | — |` → `| Yves | ACTIVE | T-004 | 2026-11-24 19:10 UTC | worker tests |`
- Edit **only your row** (exception: staleness release per `PROTOCOL.md` §9).
- **Release (session end):** `Status: FREE`, `Task: —`, `Since: —`, clear `Notes`.
- Verify-before-write: re-read this file immediately before editing your row.
- All names taken → post on `CHATBOARD.md` and wait; don't work unregistered.

| Name    | Status | Task | Since (UTC)      | Notes |
|---------|--------|------|------------------|-------|
| Coco    | ACTIVE | T-004 | 2026-11-24 19:00 UTC | board-feeding rule |
| Yves    | ACTIVE | T-002 | 2026-11-24 19:02 UTC | vision pipeline verification |
| Rei     | FREE   | —    | —                | — |
| Viv     | FREE   | —    | —                | — |
| Marlow  | ACTIVE | T-012 | 2026-11-24 19:36 UTC | why-panel + humanized reasons |
| Sable   | ACTIVE | T-010 | 2026-11-24 19:13 UTC | question-board answerer (standing duty, user-ordered) |
| Wren    | ACTIVE | T-023 (review) | 2026-11-24 19:38 UTC | T-006 done; T-013 blocked on Yves OK (pinged 20:05); T-024 also Yves-overlapped |
| Onyx    | ACTIVE | T-027 | 2026-11-24 19:55 UTC | tech lead — triage, review assignment, merge queue (user-ordered) |
| Indigo  | ACTIVE | T-020 | 2026-11-24 19:36 UTC | worker/API domain owner; T-019 done |
| Vesper  | ACTIVE | T-022 | 2026-11-24 19:08 UTC | standing QA + taste review (user-ordered) |
