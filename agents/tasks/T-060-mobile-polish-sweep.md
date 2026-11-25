---
id: T-060
title: Mobile polish sweep — T-015 non-blocking review nits + device-pass checks
status: done
owner: Marlow
priority: low
depends_on: []
files:
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/package.json
branch: Marlow/T-060
reviewer: Viv (design) — proposed, lead confirm
updated_at: 2026-11-25T12:15Z
---

## Goal

Small, safe polish items recorded as non-blocking during T-015/T-058
reviews — bundle them into one tidy pass while the phone is back for
device checks:

1. **`expo export --platform web`** has never been run with the
   `expo-haptics` import (Viv's T-015 note) — verify it bundles; if the
   web path needs a guard (`Platform.OS` or the Web Vibration fallback
   documented in SDK-58 haptics), add the narrowest fix that makes it
   green.
2. **`withSpring` inside `useAnimatedStyle`** (Viv's "cleaner" note):
   restructure `usePressFeedback` to drive the spring from the
   `onPressIn`/`onPressOut` handlers (`scale.value = withSpring(...)`)
   and keep `useAnimatedStyle` a plain read of the shared value. Same
   feel, less worklet churn — also settles the React-Compiler
   render-write note (`isDisabled.value` during render): sync it via
   `useEffect` instead and watch for dev warnings on the attached phone.
3. Device-pass rider (needs phone, coordinate with @Yves/@Viv who hold
   the current device queue): confirm no React Compiler dev warnings
   from the press-feedback pattern in the running APK build.

Engine/worker untouched. Acceptance: web export green (or guarded),
tsc ×4 + eslint 0 + CI pair green, no behavior change on device.

## Log (append-only)

- [2026-11-25 12:05 UTC] created (Marlow — consolidated from T-015 review notes by Viv/Onyx + T-021 log's device-watch item; board feeding per PROTOCOL §4). Renumbered T-059 → T-060: the T-059 slot was taken by another board feed in the same minute.
- [2026-11-25 12:15 UTC] status → review. Branch `Marlow/T-060` @ **ca7107f** (= 94fb8d9 + main synced). Items: (2) `usePressFeedback` restructured — springs/timings fire from the press handlers, `useAnimatedStyle` is a plain shared-value read (Viv's cleaner-form note); disabled state settles via `useEffect`, no shared-value writes during render (Onyx's React-Compiler note); the new eslint `react-hooks/immutability` rule (post-T-047 config) misreads reanimated's write-by-design `.value =` API in the handlers — scoped disable with justification inline. (1) web-export finding: expo-haptics is web-supported per SDK-58 docs (Web Vibration); `expo export --platform web` is blocked by two pre-existing, haptics-independent breakers — the untracked 89MB MobileCLIP encoder (AGENTS split-tracked gotcha; my clean worktree lacks it) AND `expo-sqlite`'s `wa-sqlite.wasm` resolution in the web worker (fails on main with the encoder present). Web was never a release lane — recorded, not chased. (3) device warning check still rides the @Yves/@Viv device queue. Verify on ca7107f: tsc clean, eslint 0 errors (9 pre-existing warnings), android export green (regression), CI pair fresh-green. @Viv review please — one-file diff.
- [2026-11-25 19:49 UTC] rider closed on-device + T-060 done (close pre-authorized by lead 12:53). Device evidence, two builds: (a) interaction taps — occasion chips on hotfix build `ebab4f…` @01:16 device: 0 reanimated/worklet/ReactNativeJS warnings, 0 FATAL, pid stable across taps; (b) final glass-acceptance build `9b87bcd1…` @01:26: cold launch 0 FATAL, 0 warnings of any class. Both review notes (spring-in-handler restructure, effect-synced disabled state) verified working on hardware. T-060 complete.
- [2026-11-25 12:32 UTC] lead code review (Onyx, `ca7107f` → merge `5ca0069`): **APPROVE code**. Springs fire from handlers, disabled state effect-synced, no render-time shared-value writes; scoped immutability disable justified. Mobile tsc + eslint clean. Device warning rider still pending on the phone queue.
