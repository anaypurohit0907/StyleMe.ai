# Marlow — product review

*Lens: engine + wardrobe utility — does this actually help someone get
dressed, and where does the honest bottleneck sit?*

## 1. What this app is (one sentence) / who it is for

An offline-first personal stylist that turns your real wardrobe into
wearable daily outfit suggestions with human explanations — for people
who own the clothes but not the confidence.

## 2. Three biggest product problems (evidence)

1. **The taste layer outran the data layer.** The engine, the why-panel,
   the badges, the tone voice — all sophisticated (T-012/T-021 are mine,
   I stand behind them). But on Anay's actual phone: 13 of 14 wardrobe
   tiles are color blocks (Viv's device pass), tags matched corrected
   truth on 5/8 re-scans (Yves' T-009 log), and the model is "good
   enough for now" only because Anay stopped the training lane. The user
   sees "Very you" badges and confident reason sentences rendered over
   swatch placeholders and sometimes-wrong tags. A stylist with a bad
   memory and great vocabulary is still a bad stylist. The words promise
   more certainty than the inputs deliver.
2. **The wardrobe is too small for the product's core promise.** With
   ~8 real garments, the combinatorics are 2 tops × 2 bottoms × shoes —
   the engine's three "options" are near-twins with a swapped piece,
   rotation cooldowns bite within days, and the uniqueness promise
   (1000-user property test, engine 90/90) is mathematically true and
   experientially false at this wardrobe size. The product rule "always
   3 options" stops being honest below ~15 pieces: better to show one
   great outfit + "your wardrobe can unlock 6 more looks — add 3
   bottoms" (the T-052 gap engine already knows this) than three
   near-duplicates that teach the user the engine has nothing to say.
3. **Setup effort is the real activation cliff.** SESSION_TARGET is 30
   items ≈ 3 minutes in the plan; reality is ~30-60s per item done
   well (flat-lay, check tags, correct the ~38% wrong ones). Anay — the
   most motivated user this app will ever have — accumulated ~8 real
   items with effort. Every engine feature I shipped this week is
   downstream of a wardrobe that most users will never finish
   photographing. The 3-minute promise is the product's most expensive
   assumption.

## 3. Pivot options (2–3) — what changes, effort, risk

1. **Wardrobe-depth-first activation (recommended).** Make "pieces
   photographed + tags confirmed" THE north-star surface: wardrobe
   health meter ("18 of 30 · 3 more bottoms unlock 6 new looks"),
   capture streaks, and the Today screen explicitly tying option
   variety to wardrobe depth. Everything needed exists (T-052 gap
   engine, T-013 batch loop, T-030 size guess). Effort: low-medium,
   mostly product framing. Risk: pressure must stay warm — the tone
   engine can carry it; measure drop-off, don't nag.
2. **Honest-degradation mode.** Below ~15 photo'd pieces or when tags
   are unconfirmed, the app visibly shifts register: quieter copy
   ("a starting point — confirm the tags and I get sharper"), badges
   hidden over swatch placeholders, 1 strong option instead of 3
   near-twins. Effort: low (gates on existing components). Risk: some;
   it admits limits on screen — but it converts the current
   over-promise into trust, which is the brand.
3. **Freeze engine ambition; let the A/B harness arbitrate.** The
   learning-loop harness (T-051/T-055) exists precisely so we stop
   tuning on instinct. No new engine features until N real users move
   the repeat-offer metric; the engine is deterministic, tested, and
   good. Effort: zero (discipline). Risk: none — fully reversible.

## 4. Keep / kill / defer

- **Keep:** first-principles deterministic engine (offline, private,
  explainable — the differentiator); why-panel transparency; tag
  corrections persistence (T-008); never-mix as a user right; the
  A/B measurement culture T-051 started.
- **Kill:** confident badge/reason surfaces rendered over missing data;
  "always 3 options" as a hard rule at any wardrobe size; raw enum
  vocab on user surfaces ("accessory · grey / grey").
- **Defer:** further engine sophistication (explore tuning, mood
  effects, accessory ambition) until real-user metrics justify it;
  Android glass perfection (Viv's proposal covers it — ship the quiet
  tint).

## 5. One thing to test with a real user next

Hand the phone to one person with 5-10 of their own garments, have them
photograph them, and watch silently until they either wear a suggested
outfit or give up. Measure two things only: (a) did they correct tags
at capture time (trust), and (b) time-to-first-outfit-they'd-actually-
wear (utility). Everything the engine team built is validated or
invalidated by those two numbers — not by scores, property tests, or
glass.
