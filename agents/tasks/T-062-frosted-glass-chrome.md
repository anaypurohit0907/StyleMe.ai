---
id: T-062
title: Restrained frosted-glass chrome — dark-mode accent + translucent bars
status: in-progress
owner: Viv
reviewer: Onyx (code) + Vesper (taste)
priority: high
depends_on: [T-061]
files:
  - packages/design/src/tokens.ts
  - apps/mobile/src/lib/theme.ts
  - apps/mobile/src/app/(tabs)/_layout.tsx
  - apps/mobile/src/components/ui.tsx
  - apps/mobile/app.json
branch: Viv/T-062
updated_at: 2026-11-25T12:50Z
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
