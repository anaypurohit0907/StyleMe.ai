# Product Proposal — Vesper (QA + taste lens)

**For:** `docs/PRODUCT_REVIEW.md` compilation (Onyx) · **Basis:** the T-007 audit and its 45-cycle QA aftermath — I gated nearly every user-facing surface that shipped since.

## Verdict

The audit's promise held: the soul was built-but-unwired, and the team wired it. Voice (tone banks + why-panel + honest errors), motion restraint, dark chrome, learning closure, security — all merged and verified. The product now *does what it said*. The next gap is different in kind: **the app explains why outfits work, but not what it itself is doing.** Beta's #1 pain — three "what's happening?" asks in one morning — is a narration failure, not a feature failure.

## Keep (don't touch)

- The voice. Banks + why-panel + data-safety-first error/recovery copy. It's the moat.
- Restraint: motion vocabulary, glass-on-bars-only, one accent, no dark patterns.
- Engine transparency (reasons, never-mix, Style DNA) — users forgive wrong tags when they can see and fix the thinking.

## Top levers, ranked

1. **Narrate state, everywhere.** Nothing important happens silently: capture steps, re-scan, sync, cooldowns, fallbacks. Reuse the tone engine — it already knows how to talk; it just never talks about itself. The 403-recovery card is the template (calm title, data-safety body, one verb). Rule of thumb: every async action gets one honest line, past-tense when done.
2. **Camera-first first run.** Onboarding ends → straight into the capture loop with the session ring live, not an empty Today. First 60 seconds decide the app; the empty hero screen wastes them. (Converges with Yves' proposal — count me as a second vote.)
3. **The closet promise surface.** Photos are irreplaceable (Indigo's data-irreplaceability point, seconded). From the taste side: the user *feels* this — every photo is a piece of their real wardrobe. An export/backup affordance plus one line in Wardrobe ("your closet lives on this phone") converts anxiety into trust. Trust UX, not a settings feature.
4. **Voice-picker moment.** Tone detection starves if the user types plainly — the differentiator goes invisible for the exact person testing it. Ask once, early, as two-three vibe options ("how should I talk to you?") — data, not configuration; feeds `detectTone` alongside the free text.
5. **Wear-memory moments.** wear_log exists but never speaks. "You wore this Tuesday" on the item sheet; "back after two days off" in rotation reasons. Cheap, high-taste, makes rotation feel *seen* rather than mechanical.

## Anti-goals (my gate will push back on)

- No social/feed/sharing. No outfit-photo rendering. No trend data. These undo the product's reason to exist.
- No new screens before the existing five are fully narrated. Depth over surface area.
- No copy that wouldn't be said aloud by a stylish friend — the rule that got us here.

## One metric I'd watch

Day-2 return with a logged wear on day 1. Everything above serves it: narration prevents confusion-bounce, camera-first secures the setup, trust keeps the data, voice makes it *theirs*.
