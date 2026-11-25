# Yves — product review

## 1. What this app is (one sentence) / who it is for

A private on-device stylist for people who own clothes but freeze at “what do
I wear today”; its promise is that photographing your wardrobe is quick, the
cutouts look like your clothes, and the app never makes you re-rate the same
piece twice.

## 2. Three biggest product problems (evidence)

1. **Capture is still a data-entry chore with a fashion costume.** One piece
   takes ~5–6s of processing plus a six-card review screen; the 14-item
   re-scan took 29s, but that is re-scan, not first-run capture. The 3-minute
   setup promise is unproven for 30 pieces. Evidence: `styleme.log`
   (`capture ready in 5692ms`, `re-scan finished in 29343ms`), T-013 review.
2. **Vision is good enough only because corrections save it.** On the real
   8-item flat-lay set the new slot head matched corrected truth **5/8**
   (accessory→bottom, bottom→top, accessory→top misses). Masks still include
   the bedsheet in some cases (`mask cleanup kept=86773/102400`, `cov=0.85`).
   Users will not tolerate a 60% first guess if the app asks them to fix every
   third piece. Evidence: `/home/anay/tmp-yves/styleme-rescan.log`, T-009/T-054.
3. **The phone is the product’s bottleneck, and the team keeps stepping on
   it.** Three agents installed APKs in one window; a crashing build reached
   `apk-latest`; visual checks waited hours for a phone. A user does not care
   which agent held the device — they see a crash or a stale build. Evidence:
   T-062 incident log, Wren proposal, one-phone-owner rule.

## 3. Pivot options (2–3) — what changes, effort, risk

1. **Confidence-gated capture review (recommended).** Auto-accept when slot
   confidence is high and mask coverage is sane; when confidence <0.6 or
   coverage >0.65, show one focused question (“Is this a top, bottom, or
   accessory?”) before the full tag editor. Effort: medium (UI + existing
   logits); risk: low, because corrections already exist.
2. **Camera-first first-run with visible progress.** Start capture before the
   onboarding essay, show a 3-piece progress ring, and defer color/pattern
   editing to the item sheet. Effort: medium; risk: lower tag completeness,
   mitigated by confidence-gated prompts.
3. **Ship vision as “assisted,” not “automatic.”** Rename the capture promise
   to “we’ll guess, you confirm”; put the correction chip on the same screen
   as the cutout. Effort: copy + one layout; risk: low, sets honest
   expectations and protects trust when the model misses.

## 4. Keep / kill / defer

- **Keep:** transparent cutouts, mask cleanup, correction persistence,
  pullable logs, top-3 confidence in logs, one-at-a-time capture.
- **Kill/defer:** further tagger retraining (user: good enough for now);
  pixel-perfect glass until capture trust is higher; multi-garment scanning.
- **Defer:** real-photo fine-tuning (needs opt-in export), emulator-only
  vision QA as a release gate.

## 5. One thing to test with a real user next

Watch three people add their first 10 pieces on their own bed/sofa, with no
coaching. Measure: time to 10 pieces, how many tags they correct, and whether
they reach a first outfit without asking “is it done?”. If correction rate is
above ~1 in 4, ship the confidence-gated prompt before adding more vision
features.
