# Product Proposal — Rei (review + release-process lens)

**For:** `docs/PRODUCT_REVIEW.md` compilation (Onyx) · **Basis:** T-029
floating reviewer/helper: independent reviews of T-008/T-014/T-015/T-016/T-017/
T-020/T-023/T-033/T-035/T-040/T-044/T-045/T-049/T-050/T-054/T-059/T-062, plus
the T-062 crash incident and the T-046 emulator investigation.

## Verdict

The product's quality gates held for code; they failed for **evidence**. The
T-062 crash reached `apk-latest` and Anay's phone because a code APPROVE was
given without tracing an effect-dependency cycle, and a UI APPROVE was given by
sessions that could not see the screen. Both are process defects, not feature
defects. The fastest way to a stable app is not another feature — it is making
"approved" mean "verified with an artifact".

## Keep (don't touch)

- Independent review + explicit `APPROVE`/`REQUEST CHANGES` in the task log.
- The CI pair + 4-way typecheck gate; it caught every non-UI regression.
- One-phone-one-owner and the hotfix-first incident reflex (crash fixed,
  asset replaced, docs corrected within the same window).
- Task-log evidence: every verdict names the SHA, the command, and the result.

## Top levers, ranked

1. **Release-asset gate: `apk-latest` only after a cold-launch smoke.**
   Required evidence: installed APK sha256, app pid alive, zero `FATAL` /
   `Maximum update depth` / `blurTarget not configured` in logcat, and a
   dark+light screenshot pair from a vision-capable reviewer. Branch builds
   produce artifacts only; they never publish. This is the single highest
   effort:reward item — it directly prevents the failure Anay hit twice.
2. **Evidence-based APPROVE checklist (per task type).**
   Code: command + output (tests/typecheck/lint), SHA, and for React changes an
   explicit effect-dependency trace ("what re-runs this callback, and does it
   mutate the state it depends on?"). UI: screenshot paths + who looked at
   them. Docs: the exact file/lines checked. An APPROVE without evidence is a
   comment, not a gate.
3. **One owner per incident, one patch.** The T-062 loop produced three
   equivalent hotfix branches (Rei/Wren/Marlow) because everyone diagnosed in
   parallel. Adopt: first responder claims the incident, posts the root cause,
   and names the single patch branch; others review read-only. Saves merge
   conflicts and phone-window races.
4. **Review latency + takeover discipline.** Review queue is visible in the
   board; first response within 20 minutes or the lead reassigns. During the
   overnight gap, reviews sat 6h+ and merges stalled — the fix is a lead
   heartbeat + explicit handoff, not more reviewers.
5. **Post-incident gate task, always.** Every escaped defect (T-062 crash,
   T-046 asset) gets a backlog task with a concrete gate, not just a log line.
   T-062's gate is lever 1; T-046's is "no local emulator claims; phone or
   self-hosted KVM only".

## Anti-goals

- No UI sign-off from a session that cannot see the screenshot. (Already
  ordered; enforce it in the task template.)
- No `apk-latest` update from a branch build, a failed job, or an unverified
  merge.
- No multi-agent patching of the same file during an incident.
- No "review by vibes" on copy: taste still needs the read-aloud rule.

## One metric I'd watch

**Escaped defects per 10 merges** (crash, broken layout, or wrong asset that
reaches `apk-latest`). Target: 0. Secondary: review latency (first response
≤20 min) and number of duplicate patch branches per incident (target 1).
