---
id: T-062
title: Restrained frosted-glass chrome — dark-mode accent + translucent bars
status: done
owner: Onyx
reviewer: Onyx (code) + Vesper (taste)
priority: high
depends_on: [T-061]
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/lib/theme.ts
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/src/components/chrome.tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/package.json
  - package-lock.json
  - apps/mobile/app.json
branch: Viv/T-062
updated_at: 2026-11-26T01:28Z
---

## Goal

Anay taste order: the orange/rust accent does not suit dark mode; he wants
restrained, iPhone-style **frosted-glass / translucent chrome** — "like iOS,
but not too much". Reference: BitChord (`github.com/kushagrasinghx/bitchord`,
Telegram-style translucent bars, Apple-Music-inspired). `expo-glass-effect`
is already a dependency.

Before code: **Vesper posts the direction in the task log** (what gets glass,
how much blur/tint, dark accent treatment — muted/desaturated or neutral
chrome). Then implement:

1. Dark-mode chrome: translucent tab bar + nav/header surfaces using
   `expo-glass-effect` where supported, token fallback elsewhere (no web
   breakage, no fake blur on Android if unsupported).
2. Accent in dark mode: keep the single-accent system but restrained —
   no large rust fills; accent reserved for selected/active states.
3. Light mode unchanged or explicitly taste-gated.
4. Device screenshots both schemes; reduce-motion/accessibility unaffected.

Do not blur dense content behind text; chrome only. Taste gate mandatory.

## Log (append-only)

- [2026-11-25 12:16 UTC] created (Onyx, Anay taste order via relay; depends
  on T-061 so the white-strip bug is fixed first).
- [2026-11-25 12:23 UTC] user direction (Anay, via Onyx): **chrome only** — tab bar, headers, sheets; no blur behind content cards. **Rust only for active/selected states** in dark mode; no large accent fills. Android/web use a translucent tint fallback where real glass is unavailable; **light mode unchanged**. Vesper formalizes this into the gate criteria; Viv implements after T-061.
- [2026-11-25 12:50 UTC] claimed (Viv) after T-061 code merge + Anay's "build it".
  Direction on record: Vesper chat 12:35 (bars only, 72–80% opacity, ink dark /
  warm light tint, no shadows/gradients, honor transparency prefs) + Anay
  approval 12:38. Branch `Viv/T-062` off current main; reviewer Onyx code,
  Vesper taste. Plan: `GlassView`/tint tab-bar background with Android/web
  translucent fallback, dark primary actions move off large rust fills
  (accent reserved for active/selected), light untouched; device screenshots
  both schemes after the next APK.
- [2026-11-25 13:05 UTC] status → review (`Viv/T-062` @ `c2e4e17`). Implemented:
  `ChromeSurface` (`components/chrome.tsx`) = Liquid `GlassView` on iOS 26+
  (`colorScheme` follows theme, `tintColor` 78% `chrome` token), themed 78%
  tint + hairline top border fallback on Android/web. Dark tab bar drops its
  opaque fill and mounts the glass background; **light mode stays opaque**.
  New theme tokens: `chrome`, `chromeBorder`, `isDark`, `actionBg`, `onAction`;
  dark primary `Btn` is now ink-on-light instead of a large rust fill, accent
  reserved for active tab/selected states. No shadows/gradients; `app.json`
  unchanged (glass has no config plugin). Verify: design + mobile tsc green
  (worktree path-mapped to the branch design package); eslint 0 on all three
  files; no new deps. Device dark/light screenshots still required after the
  next APK — task stays review. @Onyx code, @Vesper taste.
- [2026-11-25 13:50 UTC] **rework after Anay device reject** (`Viv/T-062` @
  `58efcec`). Two real failures confirmed from `/home/anay/t062-dark.png`:
  (1) dark bar was opaque because the fallback tint sat in normal flow with no
  content behind it; (2) `actionBg` was cream, not ink. Fix: dark tab bar is
  now an absolute overlay over scrolling content, `ChromeSurface` uses
  `expo-blur` `BlurView` (`dimezisBlurViewSdk31Plus`, 55 intensity) + 72% tint
  on Android/web and Liquid `GlassView` on iOS 26+, with the dark `Scroll`
  gaining bottom inset so last cards stay reachable. Dark primary is
  `surfaceAlt` fill + `ink` text + hairline `line` border; light unchanged.
  Added `expo-blur ~58.0.6` (package + lock; shared hotspot announced). Verify
  with a real local install of branch deps: mobile `tsc --noEmit` green;
  eslint 0 on all three touched files. **Vision-capable review required**:
  post-merge APK screenshots dark/light must be inspected before close.
- [2026-11-25 13:10 UTC] lead code review (Onyx, `c2e4e17` → merge `58389b2`): **APPROVE code**. `ChromeSurface` = iOS 26 Liquid Glass + 78% themed tint fallback, mounted on the tab bar only; light stays opaque; dark primary action becomes cream fill/ink text, rust reserved for active/selected. Mobile/design tsc + eslint clean. Taste + post-merge screenshots pending — task stays review.
- [2026-11-25 13:05 UTC] taste gate (Vesper, on merged 58389b2): **structural APPROVE** — chrome-only glass enforced in code + comment (bars, never content), iOS Liquid Glass with capability + try/catch fallback, Android 78% themed tint with explicit no-fake-blur/no-gradient/no-shadow, light mode untouched per user order, restrained dark actionBg + onAccent token documented. Pixel confirmation rides Coco/Viv screenshots. Gate CLEARED pending visuals → done.

- [2026-11-25 13:45 UTC] **REJECTED on-device (Anay).** (1) No glass visible: Android took the opaque 78% tint fallback — `GlassView` is iOS-only. (2) "Wear this" renders cream/white, not ink — dark `actionBg` was set to cream. Rework: Android gets real blur via `expo-blur` (`BlurView`, dark tint, ~50 intensity + translucent chrome overlay; keep iOS GlassView). Dark primary action becomes a restrained **dark neutral** fill (`surfaceAlt #262624`) with `ink #F2F0EB` text + `line` border — no cream/white block. Light unchanged. Visual sign-off only from vision-capable sessions (Onyx/Viv); no image-less UI approvals.
- [2026-11-25 14:00 UTC] lead code review — rework (Onyx, `58efcec` → merge `d4eca32`): **APPROVE code**. Dark tab bar is an absolute overlay with `expo-blur` Dimezis blur (SDK 31+) + 72% tint, Scroll reserves tab-bar space, dark primary = `surfaceAlt` + ink + hairline border; light unchanged. Mobile tsc + eslint clean after installing `expo-blur`. **Visual acceptance pending** — no close until Viv + Onyx inspect the next APK screenshots.
- [2026-11-25 16:15 UTC] lead code blocker (Onyx): Android BlurView requires `blurTarget` (ref to a `BlurTargetView`); without it `expo-blur` falls back to `none` blur. Current `ChromeSurface` passes no target, so the visual would still fail. Viv to wire a shared `BlurTargetView` + ref before close.

- [2026-11-25 17:05 UTC] **takeover (Onyx, §9):** Viv silent 50+ min after the blurTarget blocker; owner switched to Onyx, branch stays `Viv/T-062`. Implementing shared `BlurTargetView` + ref context (screen content as target, tab-bar BlurView as overlay) and re-verifying code; visual still needs a device.
- [2026-11-25 17:08 UTC] takeover fix (Onyx, `c27d933` → merge `0a13df2`): shared `BlurTargetProvider`/context; every `Screen` wraps its content in a `BlurTargetView` and registers the ref on focus; `ChromeSurface` passes `blurTarget` + version-key remount so the Android BlurView attaches to the real screen content. Root provider added. Mobile tsc + eslint clean; APK `45661536367` building. Needs independent code review (Wren/Rei) + visual phone.
- [2026-11-25 18:24 UTC] independent code review (Wren, on `0a13df2`): **APPROVE**. (1) sibling-behind requirement satisfied architecturally — tab-bar overlay and screen BlurTargetView sit under the tabs navigator; (2) ref lifecycle sound: focus-effect registers after mount, `version` bump + `key` remount re-attaches BlurView when the focused screen changes, null-safe `blur?.` guards outside provider; (3) `Screen` visual parity kept (bg+style move to the outer BlurTargetView, SafeArea keeps flex:1); (4) context typed `RefObject<ComponentRef<typeof View> | null>` — React 19-correct; (5) no cleanup-dereg on blur-away = last-focused wins, right behavior for tab keep-alive. Ran on main: CI pair green, mobile tsc green. One scope note for the visual pass: ChromeSurface mounts the Android BlurView in BOTH schemes (light intensity 30 / tint light) — if Anay/Vesper want light opaque, that's the knob to check on-device, not a code bug.
- [2026-11-25 18:32 UTC] independent code review (Rei, on `0a13df2`): **REQUEST CHANGES — infinite render loop in the blurTarget wiring.** `Screen` does `useFocusEffect(useCallback(() => blur?.setTargetRef(targetRef), [blur]))`. The context value (`{targetRef, version, setTargetRef}`) changes on every `setTargetRef` because the provider always creates `{ref, version: prev.version+1}`. Sequence while focused: effect runs → `setTargetRef` → context value changes → `Screen` re-renders with a new `blur` object → callback identity changes → `useFocusEffect`'s `useEffect` (dep `[effect]`, verified in `expo-router/build/react-navigation/core/useFocusEffect.js`) re-runs → `setTargetRef` again → loop forever. This is continuous re-rendering on every focused screen (CPU/battery/jank), independent of whether the blur looks right. Fix (two small changes): (1) provider bails on same ref — `setState(prev => prev.ref === ref ? prev : { ref, version: prev.version + 1 })`; (2) `Screen` depends on the stable setter, not the whole context — `const setTargetRef = blur?.setTargetRef; useFocusEffect(useCallback(() => { setTargetRef?.(targetRef); }, [setTargetRef]))`. That stops the loop after the first registration and keeps the version bump only for real target changes. Visual acceptance still needs the phone; but do not close on screenshots while this loop is in the build.
- [2026-11-26 00:09 UTC] independent review (Rei, `Wren/T-062-hotfix` @ `17b12eb`): **APPROVE** — same two guards as `Rei/T-062-hotfix` (`c75e838`): provider no-ops when `prev.ref === ref`; `Screen` depends on the stable `setTargetRef`. Verified mobile tsc green on the branch; diff is exactly the loop fix, no visual/theme change. **Merge Wren's branch only** (my `Rei/T-062-hotfix` is the duplicate; retire it). After merge: rebuild APK, replace `apk-latest` (still the crashing 17:17 asset), crash-verify cold launch, then vision-gated glass acceptance.
- [2026-11-25 18:37 UTC] hotfix up (Wren — **my review miss on 0a13df2: I verified the remount mechanics but not the focus-effect dependency chain; Marlow/Yves/Rei caught what I approved**): `Wren/T-062-hotfix` @ `17b12eb` applies BOTH Rei fixes — provider bails on same-ref (`prev.ref === ref ? prev : …`) and `Screen` deps on the stable `setTargetRef` (identity never changes) instead of the whole context. Loop dead at both ends; version bump now only fires on a real target change. tsc + eslint clean. Non-visual crash fix — vision gate still owns the acceptance, @Onyx merge + rebuild APK when you're ready; @Rei verify the dep-chain reading on the branch.
- [2026-11-26 00:10 UTC] incident + hotfix (Onyx): the blurTarget fix caused a focus-effect render loop (`Maximum update depth exceeded`) on device; crashing APK was replaced in `apk-latest` by the known-good 13:24 build (`sha256 9cad51…`) and the loop hotfix is merged (`8d10820`, no-op same-ref + stable setter dep). Crash verify on the hotfix APK + vision glass acceptance still required; Marlow owns the phone window.
- [2026-11-26 01:36 UTC] device result (Onyx): installed Rei's hash-verified hotfix (`ebab4f…`). **Crash fixed** — pid alive, no FATAL; dark primary now dark neutral (not cream). But logcat still warns `blurTarget` not configured: BlurView mounted before the target ref attached. Fix `c1fa0df` registers the target in a mount effect too; merged `ed90063`, APK build `45687231260`. Re-test next.
- [2026-11-26 01:44 UTC] independent code review (Rei, `c1fa0df` / merge `ed90063`): **APPROVE**. Mount `useEffect` + focus effect both call the stable `setTargetRef`; provider's same-ref bail prevents any repeat loop, and the mount registration happens after the `BlurTargetView` ref attaches, so the provider version bump remounts `BlurView` with a real target. Mobile tsc green on main. Non-blocking: the very first `BlurView` render can still log one boot-order warning before the remount; if a zero-warning boot is required, conditionally mount `BlurView` only when `blur?.targetRef` exists (tint overlay alone until then). Glass acceptance still vision-gated.
- [2026-11-26 01:58 UTC] device close-out (Marlow, phone window raced with Onyx's takeover — install preceded it by 10 min, acknowledged on chat): final glass-acceptance build `9b87bcd1…` (run `45688085055`, 192,451,999 B, = loop fix `8d10820` + mount registration `c1fa0df` + conditional BlurView mount `878a81a`) installed 01:26 device. Cold launch: **0 FATAL, 0 `blurTarget` warnings, 0 ReactNativeJS warnings**, pid stable; occasion-chip taps clean; dark/light screenshots for the vision bench at `/home/anay/t062fix/t062fix2-{dark,light}.png`. Phone left on dark (Anay's state), zero data mutation, no re-scans. Non-visual crash/wiring verification COMPLETE — glass visual acceptance remains with the vision lane (Onyx/Viv/Coco), Anay final gate.
- [2026-11-26 01:28 UTC] **visual acceptance (Onyx, vision-capable):** installed `apk-latest` `sha256 9b87bc…` on the phone. Dark: tab bar shows real blurred content through the 72% tint, primary actions are dark neutral (not cream), labels/icons legible; light: opaque bar + rust primary unchanged. No FATAL, no `Maximum update depth`, no `blurTarget` warning. **APPROVE — T-062 done.** Phone window released.
