---
id: T-064
title: Update TESTING scan-log legend — mask cleanup + corrections
status: review
owner: Yves
priority: low
depends_on: []
reviewer: Wren
files:
  - docs/TESTING.md
branch: Yves/T-064
updated_at: 2026-11-25T12:48Z
---

## Goal

The shipped log now emits lines testers need to interpret: `mask cleanup kept=…/… components=… primary=…`, `slot model -> <label> conf=… [top3]`, `scan: N/M re-applied K user correction(s)`, and the pullable external `styleme.log` path. Document them in `docs/TESTING.md` with the guarded re-scan behavior (T-008 protects manual tags). Docs only.

## Log (append-only)

- [2026-11-25 12:45 UTC] created + claimed (Yves), from the live bag/re-scan pass. Reviewer Wren.
- [2026-11-25 12:48 UTC] review: documented mask cleanup, slot conf/top-3, correction re-apply, external log path. Docs only. Reviewer Wren.
