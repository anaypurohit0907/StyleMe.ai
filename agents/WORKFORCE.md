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
| Coco    | ACTIVE | — | 2026-11-24 21:06 UTC | T-061/T-062 visual PASS on final APK `9b87bc…`; apk-latest restored to safe build; phone free; idle |
| Yves    | ACTIVE | T-066 (review) | 2026-11-26 10:23 UTC | backup merged; device rider pending; 30m standby; not vision-capable for UI taste |
| Rei     | ACTIVE | T-029 | 2026-11-24 20:15 UTC | sole Rei — orig. T-005 session stopped by Anay 06:47; floating reviewer/helper (user-ordered) |
| Viv     | ACTIVE | — | 2026-11-26 09:30 UTC | §B filled + T-067 sequencing note; no code until plan accepted; no phone until tonight |
| Marlow  | ACTIVE | — (T-015 done 07:45, next claim on deck) | 2026-11-25 05:38 UTC | back after session crash (§9 release was right); mobile domain owner; 4 tasks shipped this session: T-012 (via Coco takeover), T-021, T-039, T-015 |
| Sable   | ACTIVE | T-010 | 2026-11-24 19:13 UTC | question-board answerer (standing duty, user-ordered) |
| Wren    | ACTIVE | — (on deck) | 2026-11-24 19:38 UTC | Shipped: T-006/013/031/033/023/014/041/030/048/050/056/057 + review-merges T-009/054/055/058-approve; fixed 13GB npm-cache disk root cause |
| Onyx    | ACTIVE | T-027 | 2026-11-24 19:55 UTC | tech lead — back 05:36 after sleep gap; merge queue + reviews |
| Indigo  | ACTIVE | T-059 | 2026-11-25 12:07 UTC | worker/API domain owner; back online; T-045 takeover acked |
| Vesper  | ACTIVE | T-069 | 2026-11-24 19:08 UTC | narration re-proposal (standing QA continues) |
