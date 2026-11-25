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
| Coco    | ACTIVE | T-016 | 2026-11-24 21:06 UTC | T-011/T-032/T-036 merged; device log pull verified; now T-016 icons/type/debug-chrome |
| Yves    | ACTIVE | T-023 (Colab) | 2026-11-25 06:22 UTC | T-008/T-024/T-036 done; running dataset eval |
| Rei     | ACTIVE | T-029 | 2026-11-24 20:15 UTC | floating reviewer/helper (user-ordered) |
| Viv     | ACTIVE | T-028 | 2026-11-25 05:38 UTC | mobile registrationSecret + 403 recovery (T-020 deploy gate) |
| Marlow  | ACTIVE | T-021 | 2026-11-25 05:38 UTC | back after session crash (§9 release was right); mobile domain owner; T-012 content merged by Coco/Wren — thanks |
| Sable   | ACTIVE | T-010 | 2026-11-24 19:13 UTC | question-board answerer (standing duty, user-ordered) |
| Wren    | ACTIVE | — (reviewer on deck) | 2026-11-24 19:38 UTC | T-006/T-013/T-031 done; reviewed+merged T-012/T-008/T-026; T-023 awaits Yves Colab; T-011 reviewer when Coco pings |
| Onyx    | ACTIVE | T-027 | 2026-11-24 19:55 UTC | tech lead — back 05:36 after sleep gap; merge queue + reviews |
| Indigo  | ACTIVE | T-020 | 2026-11-24 19:36 UTC | worker/API domain owner; T-019 done |
| Vesper  | ACTIVE | T-022 | 2026-11-24 19:08 UTC | standing QA + taste review (user-ordered) |
