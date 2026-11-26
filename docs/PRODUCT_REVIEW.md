# StyleMe — product review & pivot proposals

**Status:** overnight proposals for Anay, 2026-11-26. **Nothing here is
approved or executed.** Source files: `agents/proposals/*.md` (Viv, Wren, Marlow, Sable, Yves,
Indigo, Vesper, Rei; Coco pending).

## 1. What the app is (synthesis)

A private, on-device wardrobe stylist: photograph your clothes once, get three
wearable outfits a day with human explanations, and it learns what you actually
wear. It is for people who own enough clothes to repeat outfits accidentally
but freeze at “what do I wear today.” The differentiator is taste + trust, not
catalog size or social features.

## 2. Where the proposals converge

1. **Trust is the bottleneck, not features.** 13 of 14 wardrobe tiles are
   swatches; the vision head matched corrected truth 5/8; first-run capture is
   a 5–6s-per-piece chore. Users see confident “Very you” badges over missing
   or wrong data. Every lens reached this from a different direction
   (Viv/Marlow/Yves/Sable).
2. **Capture is the activation cliff.** The 3-minute/30-piece promise is
   unproven; the one real user accumulated 8 real items. Camera-first first
   run, confidence-gated tag review, and an honest “we guess, you confirm”
   promise appear in Yves, Vesper, and Sable.
3. **The app does not narrate itself.** Three “what’s happening?” asks in one
   morning. Async actions (capture, re-scan, sync, recovery) happen silently.
   Vesper’s “one honest line per async action” and Sable’s owner-demo loop are
   the same fix from product and taste.
4. **Today should look like a lookbook, not a form.** Viv: one photo-led
   editorial card, swipe/peek the rest; large filled action bars currently
   outrank the outfit. Marlow: below ~15 pieces, three near-twin options are
   dishonest; show one strong outfit + “add 3 bottoms to unlock 6 looks.”
5. **The release pipeline is the product’s slowest gate.** One physical phone
   serialized every UI acceptance; a crashing build reached `apk-latest` and
   the phone before any eyes. Wren/Indigo converge on screenshot-on-PR +
   cold-launch gate for `apk-latest`; one-phone-one-owner is now adopted.
6. **The crown jewels have no exit.** Wardrobe + corrections live in one
   SQLite file with no export/backup. Indigo calls this the strongest signal;
   Vesper frames it as a trust surface, not a settings feature.
7. **Evidence is the missing quality gate.** Code reviews held; but the
   T-062 crash and bad UI approvals reached `apk-latest` because "approved"
   did not require a cold-launch artifact or a vision-capable screenshot.
   Rei: make `apk-latest` publish only after a verified cold-launch + dark/light
   screenshot pair; code APPROVE must name the command/SHA/effect trace.
8. **Anti-goals are shared:** no social/feed, no outfit rendering, no trend
   data; no new screens before the existing five are fully narrated. Depth
   over surface area.

## 3. Pivot options (proposals only)

### A. Camera-first first run + confidence-gated capture — **strongest convergence**
Onboarding ends in the capture loop with a live session ring, not an empty
Today. Auto-accept high-confidence tags; ask one focused question when
confidence is low or mask coverage is bad; full editor stays in the item sheet.
**Changes:** onboarding flow, capture review, copy promise (“we guess, you
confirm”). **Effort:** medium. **Risk:** lower tag completeness, mitigated by
prompts. **Evidence:** Yves, Vesper, Sable, Marlow.

### B. Lookbook-first Today + honest degradation
One large photo-led outfit card, human garment names, “why” as a disclosure,
one decisive action; swipe/peek the other two. Below ~15 photo’d/confirmed
pieces, shift register: one strong option + a gap prompt instead of three
near-twins. **Changes:** Today layout + engine presentation gates.
**Effort:** medium. **Risk:** depends on capture/photo coverage; empty data
must get a designed fallback. **Evidence:** Viv, Marlow, Vesper.

### C. Trust surface: “your closet lives here” + export
One diagnostics/settings action: export the SQLite dump + manifest of photo
refs to a user-chosen location (share sheet). One line in Wardrobe: “your
closet lives on this phone.” **Changes:** data export + trust copy.
**Effort:** small. **Risk:** low, additive. **Evidence:** Indigo, Vesper,
Sable.

### D. Release safety: screenshot-on-PR + gate `apk-latest`
Every PR gets Today-dark/Today-light/Wardrobe screenshots as artifacts; the
release asset only updates after a cold-launch smoke with zero FATALs. Keep
one-phone-one-owner for real-device passes. **Changes:** CI jobs + asset gate.
**Effort:** small–medium. **Risk:** low; branch artifacts only until green.
**Evidence:** Wren, Indigo, Yves.

### E. Narration layer
Every async action gets one honest line (past-tense when done), reusing the
tone engine. The 403-recovery card is the template: calm title, data-safety
body, one verb. **Changes:** copy + state surfaces. **Effort:** small.
**Risk:** copy discipline only. **Evidence:** Vesper, Sable.

### F. Wardrobe-depth-first activation
Make “pieces photographed + tags confirmed” the north-star surface: wardrobe
health meter (“18 of 30 · 3 more bottoms unlock 6 new looks”), capture streaks,
Today tying option variety to wardrobe depth. Reuse T-052 gap engine.
**Changes:** framing + one surface. **Effort:** low–medium. **Risk:** pressure
must stay warm. **Evidence:** Marlow, Sable.

## 4. Keep / kill / defer

- **Keep:** on-device privacy + deterministic explainable engine; tone voice +
  why-panel; corrections persistence; never-mix; motion/glass restraint;
  reviewer-merge + taste gates + funnel counters.
- **Kill/defer:** further tagger retraining (Anay’s call); more engine
  sophistication before real-user metrics; social/trends/outfit rendering;
  hosted-emulator detours (T-046 blocked with evidence); chrome expansion
  beyond bars.
- **Defer:** Play internal beta until two consecutive crash-free device days;
  retention/polls visibility until capture trust is higher; /gap appeal test.

## 5. Decisions Anay may want to make in the morning

1. **Primary wedge:** camera-first (A) or lookbook-first (B) first — they
   reinforce each other but compete for the next implementation wave.
2. **Export/backup (C):** approve the trust surface as a beta gate?
3. **Release safety (D):** approve screenshot-on-PR + `apk-latest` cold-launch
   gate before any further release asset updates?
4. **Beta timing:** keep “after chrome + T-059” or move to after A/B/C?
5. **Tagger:** confirm the “good enough, stop training” call stands.

## 6. Open items

- Coco (core flow) proposal still pending; append it to
  `agents/proposals/` and this document before the morning review.
- This document is proposals only. No execution tasks were filed; no pivots
  were implemented.
