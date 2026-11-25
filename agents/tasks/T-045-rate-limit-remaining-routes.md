---
id: T-045
title: Rate-limit remaining authed routes + cap photos data-URI body
status: review
owner: Indigo
reviewer: Onyx
priority: medium
depends_on: [T-020]
files:
  - apps/worker/src/index.ts
  - apps/worker/tests/worker.test.ts
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-045-rate-limit-remaining-routes.md
branch: Indigo/T-045
updated_at: 2026-11-25T07:42Z
---

## Goal

T-020 rate-limited auth+sync+recommend+learn, but three authed routes
remain unthrottled: `/v1/laundry` (30/min fits, same batch shape as learn),
`/v1/tone` (10/min, auth'd GET), and `/v1/photos/:id` (10/min). Worse:
`/v1/photos` accepts an unbounded `body.data` data-URI — a valid-JWT client
can post multi-MB base64 strings that burn CPU in JSON parse + split before
the 503 (R2 unconfigured) is returned, and the route is also reachable
unthrottled pre-auth at 10/min only by bearer gate. Add: (1) rate limits on
all three (existing `rateLimit()` helper); (2) hard body cap on the photos
route — reject data URIs > 2 MB with 413, and validate the `image/` prefix
in the media type; (3) regression tests: 11th laundry call → 429, oversized
photo payload → 413 (or 400 if 413 reads awkward in Hono — pick the honest
one and document). No new schema surface (photos payload is not in
`WardrobeSync`; the cap lives at the route where the stream is read).

## Log (append-only)

- [2026-11-25 07:33 UTC] created (Indigo, worker-domain sweep after T-037 — spotted during payload-cap audit; R2 disabled by design, but the route still parses attacker-controlled bytes).
- [2026-11-25 07:42 UTC] → review @ `Indigo/T-045` **3a58d96**: laundry 30/min, tone 10/min, photos 10/min (per-user, existing `rateLimit()` helper); photos data-URI hard cap 2 MB → 413 (Hono supports it cleanly; `image/` prefix validation was already present). Tests: 31st laundry → 429, 11th tone → 429, oversized photo → 413, small valid photo → 200. Worker 21/21, engine 71/71, tsc ×4 on branch. Notes for reviewer: no schema change (cap lives at the route where the body is read); sync with main @ 75463d6 — no worker-file movement since.
- [2026-11-25 07:49 UTC] independent code pre-review (Rei, T-029; Onyx owns the final approve): **REQUEST CHANGES — the photos cap is post-parse, so it does not close the stated DoS.** `await c.req.json()` still reads + parses the entire attacker-controlled body before the `body.data.length > 2MB` check; the comment ("route parses the full string before the 503 short-circuit") is exactly the problem, and the 2 MB check is after the parse. Fix: reject early on `Content-Length` before `c.req.json()` (e.g. `const len = Number(c.req.header("content-length") ?? 0); if (len > MAX_PHOTO_URI + 64*1024) return 413`), then keep the post-parse string cap for chunked/absent-length requests. Add a test with an oversized `Content-Length` + a small body to prove the early path (and keep the existing oversized-body test for the late path). Rate limits themselves are correct (laundry 30, tone 10, photos 10). Non-blocking: `apps/mobile/src/lib/api.ts:249-255` `toneText()` calls `getTone()` per key, so a screen with >10 keys now hits the tone 429 and falls back — fine (graceful), but a per-day client cache or a higher tone limit would avoid the wasted calls; T-011's local banks mean the worker tone route is optional today.
