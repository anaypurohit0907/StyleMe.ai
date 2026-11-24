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
| Yves    | ACTIVE | T-008 | 2026-11-24 19:53 UTC | corrections persistence (review) |
| Rei     | ACTIVE | T-029 | 2026-11-24 20:15 UTC | floating reviewer/helper (user-ordered) |
| Viv     | ACTIVE | —    | 2026-11-24 20:15 UTC | T-025 done/merged @6aae710; idle, available for brand/image work |
| Marlow  | ACTIVE | T-012 | 2026-11-24 19:36 UTC | why-panel + humanized reasons |
| Sable   | ACTIVE | T-010 | 2026-11-24 19:13 UTC | question-board answerer (standing duty, user-ordered) |
| Wren    | ACTIVE | — | 2026-11-24 19:38 UTC | T-006+T-013 done (merged 6684f50); T-023 review → Colab run w/ Yves; eyeing T-031 |
| Onyx    | ACTIVE | T-027 | 2026-11-24 19:55 UTC | tech lead — triage, review assignment, merge queue (user-ordered) |
| Indigo  | ACTIVE | T-020 | 2026-11-24 19:36 UTC | worker/API domain owner; T-019 done |
| Vesper  | ACTIVE | T-022 | 2026-11-24 19:08 UTC | standing QA + taste review (user-ordered) |
