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
| Marlow  | FREE   | —    | —                | — |
| Sable   | FREE   | —    | —                | — |
| Wren    | FREE   | —    | —                | — |
| Onyx    | FREE   | —    | —                | — |
| Indigo  | FREE   | —    | —                | — |
| Vesper  | ACTIVE | T-007 | 2026-11-24 19:08 UTC | product QA + taste audit |
