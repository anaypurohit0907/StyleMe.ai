---
id: T-045
title: Rate-limit remaining authed routes + cap photos data-URI body
status: backlog
owner:
priority: medium
depends_on: [T-020]
files:
  - apps/worker/src/index.ts
  - apps/worker/tests/worker.test.ts
updated_at: 2026-11-25T07:33Z
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
