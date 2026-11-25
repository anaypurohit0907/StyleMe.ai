---
id: T-064
title: Update TESTING scan-log legend — mask cleanup + corrections
status: done
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
- [2026-11-25 12:57 UTC] docs review (Wren, on `Yves/T-064` @ 7218336): **APPROVE**. Each new legend line verified against the emitting code: `mask cleanup kept=…/102400 components=… primary=…` matches segment.ts:189 exactly (T-054 format); the correction line matches dna.tsx:159 (`{label} re-applied {n} user correction(s)` under the `scan` tag); slot top-3 explanation matches the existing log; the pullable-log path was already documented (T-034) so no duplication. Accurate, scoped, no overclaims. T-064 done — taste gate n/a (tester-facing log legend, not product copy).
