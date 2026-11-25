# Wren — product review

## 1. What this app is (one sentence) / who it is for

A private, on-device wardrobe stylist that photographs your clothes, learns
what you actually wear, and picks three outfits a day — for people who own
enough clothes to repeat outfits accidentally but not enough to never care.

## 2. Three biggest product problems (evidence)

**1. One physical phone is the release pipeline's heart.** Every UI
acceptance serializes through Anay's attached phone: today the T-062 tab bar
took three build→install→judge cycles over ~6 hours of wall-clock for what is,
functionally, a bottom bar. The emulator replacement died on all six hosted
runner configurations (T-046: local QEMU segfault, ubuntu no-KVM, macos-13
retired, macos-15-intel boot-dies, arm64 never connects, install
`Broken pipe`), so "device-verified" means "wait for Anay to be home, awake,
and plugged in." The vision-capable-only review rule (correct, after the
13:42 rejection) plus one-phone-one-owner (correct, after the three-installer
race) made a serial bottleneck *more* serial.

**2. Bugs reach the APK before any eyes do.** Two of my own approvals today
shipped defects to installed builds: T-036 round 1 (`File.create()` can't
bootstrap a nonexistent external file — my review checked the API shape, not
the platform permission semantics) and the blurTarget focus-effect loop
(0a13df2 — I verified the remount mechanics, missed the dependency cycle; the
crashing 17:17 asset then served from `apk-latest` to the phone until Coco
restored the 13:24 build). Pattern: code review catches ~85%, no pre-merge
device/visual smoke exists, and each miss costs a root-cause + hotfix +
rebuild + reinstall cycle measured in hours.

**3. Our own documentation lies to us, and coordination is expensive.**
Concrete drift from one day: root AGENTS.md claimed vision assets aren't in
git (T-050), then my "fix" over-claimed the opposite (T-056 — the MobileCLIP
encoder is bundle-only); T-030's premise ("onboarding already asks wardrobe
size") was false; task IDs collided twice (T-046 dup, T-055 renumber);
`apk-latest` briefly advertised a crashing build. Each incident cost real
minutes across multiple agents. With 10 parallel sessions on a shared
worktree, verify-before-write retries, merge choreography, and branch/ID
hygiene are now a measurable tax on every single task.

## 3. Pivot options (2–3) — what changes, effort, risk

**A. Self-hosted KVM runner for CI device smoke (the one thing T-046 proved
we need).** A small always-on x86 box with KVM (~$20/mo) running the
existing `emulator.yml` boot→install→screenshot→log flow. Every PR gets
actual screenshots + a boot log before review. Effort: medium, one-time.
Risk: low. This converts the serial phone bottleneck into an async artifact
and gives the vision-capable reviewers something to look at per-PR instead
of per-device-window.

**B. Screenshot-on-PR as a review artifact.** Even before (A): macos-15
arm64 already builds our arm64 APK green (proven today), and `adb exec-out
screencap` works headless. A lightweight job posting Today-dark/Today-light/
Wardrobe PNGs into the PR would have caught both the white "Wear this"
buttons and the opaque bar *before* Anay did. Effort: small. Risk: low
(branch artifacts only, never touch `apk-latest` with non-green builds).

**C. Gate `apk-latest` + shrink the release cadence.** `apk-latest` should
only ever be overwritten by a build whose cold-launch smoke passed; tonight
it served a crash asset. Effort: tiny (workflow ordering + digest check).
Risk: none. Longer term: the process worked *because* reviewers held the
line (both gates refused to close without device proof) — keep the gates,
remove the single-phone serialization that makes them slow.

## 4. Keep / kill / defer

- **Keep:** reviewer-merge (TEAM §5.5) — it merged 9 tasks through two lead
  absences today; taste gates + vision-capable-only UI review; funnel
  counters (T-058) so the beta gates are measurable; docs-as-tasks and
  verify-before-write (the coordination tax is real but the alternative is
  the incident log we also had today).
- **Kill:** further hosted-emulator attempts — six configurations, six
  failures, T-046's evidence file is complete; `apk-latest` overwrite on
  push without a green smoke.
- **Defer:** Play internal beta until two consecutive crash-free device
  days exist (today had one crash day); AAB/Play uploads stay manual
  (Anay-gated) as already decided.

## 5. One thing to test with a real user next

Hand the phone to someone who has never seen the app — not Anay, not a
tester who read TESTING.md — and watch the first five minutes unassisted,
counting every hesitation: the name prompt, the style-words field, framing
the first garment, trusting the auto-tags, the first "Wear this." The
capture loop (T-013) was built for exactly this moment and nobody has run
it. The funnel counters are already in Diagnostics to score it.
