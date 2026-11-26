---
id: T-070
title: Release safety — publish gate, PR artifacts, pre-push gate
status: review
owner: Onyx
reviewer: Wren
priority: critical
depends_on: []
files:
  - .github/workflows/android.yml
  - .github/workflows/ci.yml
  - .githooks/pre-push
  - scripts/install-hooks.sh
  - package.json
  - docs/RELEASE.md
  - docs/EXECUTION_PLAN.md
  - agents/WORKFORCE.md
  - agents/BOARD.md
  - agents/CHATBOARD.md
  - agents/tasks/T-070-release-safety.md
branch: Onyx/T-070
updated_at: 2026-11-26T08:45Z
---

## Goal

Anay 07:16 UTC: **release safety is non-negotiable — CI workflows +
pre-commit/pre-merge gates on `main` so broken software cannot reach
`apk-latest` again. Onyx owns it.** Plan: `docs/EXECUTION_PLAN.md` §D.

Tier 1 — publish-path hardening (DONE):
- Push builds are workflow artifacts only; `apk-latest`/`aab-latest` publish is
  a separate manual `workflow_dispatch` job on `main` with
  `environment: production` (reviewer approval can be required in repo
  settings).
- The same Android run now gates on typecheck ×4, engine+worker tests, mobile
  lint, vision-bundle completeness, and `expo export --platform android`
  before it builds or can publish.
- CI adds mobile lint.

Tier 2 — pre-merge evidence:
- Android workflow also runs on `pull_request` touching `apps/mobile/**` and
  uploads the arm64 APK/AAB as PR artifacts (no publish), so UI reviewers can
  install the exact PR build.
- Shared-box pre-push hook (`.githooks/pre-push`): code pushes run the CI pair
  + typecheck + mobile lint locally; coordination-only pushes skip instantly.
- Document the human cold-launch checklist that must be recorded before a
  manual publish (FATAL grep, pid stable, dark/light screenshots).

Tier 3 — decisions for Anay (not blocking tier 1/2):
- Required checks / branch protection needs a PR-based merge flow; current
  agents push directly to `main`. Recommend: keep direct coordination commits,
  route code through PRs with required `typecheck + tests` once agents are
  briefed.
- True automated cold-launch needs a self-hosted KVM runner; phone-first stays
  the evidence source until then.

## Log (append-only)

- [2026-11-26 07:40 UTC] created (Onyx). Tier 1 implemented 07:25–07:35 UTC
  (commit `836d6e4`), CI green on the new lint gate.
- [2026-11-26 08:45 UTC] tier 2 validated: Android run `45776093487` (push `d935f4f`) **success** — typecheck ×4, engine+worker tests, mobile lint, vision assert, `expo export`, signed APK+AAB all passed in one run; publish job skipped on push as designed; CI `45776093544` success. Pre-push hook exercised on the same push (tests/typecheck/lint green). Ready for Wren's independent review; tier 3 is Anay's decision (PR/required-checks flow, KVM runner).
