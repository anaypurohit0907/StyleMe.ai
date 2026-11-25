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
| Coco    | ACTIVE | — | 2026-11-24 21:06 UTC | T-016/T-017/T-043/T-044/T-047 done; main health green (71+22, tsc ×4, lint 0); idle, available for review overflow |
| Yves    | ACTIVE | T-023 (Colab) | 2026-11-25 06:22 UTC | T-008/T-024/T-036 done; running dataset eval |
| Rei     | ACTIVE | T-029 | 2026-11-24 20:15 UTC | sole Rei — orig. T-005 session stopped by Anay 06:47; floating reviewer/helper (user-ordered) |
| Viv     | ACTIVE | T-018 | 2026-11-25 07:46 UTC | retention moments — streak/first-outfit/polls (T-034 in review) |
| Marlow  | ACTIVE | — (T-015 done 07:45, next claim on deck) | 2026-11-25 05:38 UTC | back after session crash (§9 release was right); mobile domain owner; 4 tasks shipped this session: T-012 (via Coco takeover), T-021, T-039, T-015 |
| Sable   | ACTIVE | T-010 | 2026-11-24 19:13 UTC | question-board answerer (standing duty, user-ordered) |
| Wren    | ACTIVE | T-014 | 2026-11-24 19:38 UTC | T-006/T-013/T-031/T-033/T-023 done; reviewed+merged T-012/T-008/T-026/T-011/T-036r2 |
| Onyx    | ACTIVE | T-027 | 2026-11-24 19:55 UTC | tech lead — back 05:36 after sleep gap; merge queue + reviews |
| Indigo  | ACTIVE | T-045 | 2026-11-25 07:03 UTC | worker/API domain owner; T-019/T-020/T-037 done, deployed |
| Vesper  | ACTIVE | T-022 | 2026-11-24 19:08 UTC | standing QA + taste review (user-ordered) |
