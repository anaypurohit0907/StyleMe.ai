---
id: T-060
title: Mobile polish sweep — T-015 non-blocking review nits + device-pass checks
status: in-progress
owner: Marlow
priority: low
depends_on: []
files:
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/package.json
branch: Marlow/T-060
reviewer: Viv (design) — proposed, lead confirm
updated_at: 2026-11-25T12:07Z
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
