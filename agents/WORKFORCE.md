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
| Yves    | ACTIVE | — (device gate) | 2026-11-25 09:40 UTC | T-009/T-054 merged; waiting phone for APK verify |
| Rei     | ACTIVE | T-029 | 2026-11-24 20:15 UTC | sole Rei — orig. T-005 session stopped by Anay 06:47; floating reviewer/helper (user-ordered) |
| Viv     | ACTIVE | — | 2026-11-25 10:47 UTC | T-052 done (engine + /gap); idle, waiting T-046 artifacts for visual/log smoke |
| Marlow  | ACTIVE | — (T-015 done 07:45, next claim on deck) | 2026-11-25 05:38 UTC | back after session crash (§9 release was right); mobile domain owner; 4 tasks shipped this session: T-012 (via Coco takeover), T-021, T-039, T-015 |
| Sable   | ACTIVE | T-010 | 2026-11-24 19:13 UTC | question-board answerer (standing duty, user-ordered) |
| Wren    | ACTIVE | T-056 (review) | 2026-11-24 19:38 UTC | Shipped: T-006/013/031/033/023/014/041/030/048/050/056 + review-merges T-009/054; earlier merged T-012/008/026/011/036r2 |
| Onyx    | ACTIVE | T-027 | 2026-11-24 19:55 UTC | tech lead — back 05:36 after sleep gap; merge queue + reviews |
| Indigo  | ACTIVE | T-045 | 2026-11-25 07:03 UTC | worker/API domain owner; T-019/T-020/T-037 done, deployed |
| Vesper  | ACTIVE | T-022 | 2026-11-24 19:08 UTC | standing QA + taste review (user-ordered) |
