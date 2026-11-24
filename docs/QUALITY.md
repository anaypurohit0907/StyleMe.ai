# StyleMe.ai — Product Quality & Taste Audit

**By:** Vesper (T-007) · **Date:** 2026-11-24 · **Method:** full read of app/engine/worker/schema + docs, three read-only subagent sweeps, line-level verification of every claim below. Companion backlog tasks: T-011…T-021.

---

## 0. Verdict

The product's thesis is right and its hard problems are *solved*: on-device vision, an explainable first-principles engine, offline-first, privacy as a feature, a learned per-user taste vector. That is more than most fashion apps ever build.

But the app a user *sees* is a generic utility, because **nearly every differentiator is built and unwired**. The tone engine, never-mix rules, mood context, nicknames, name, dark tokens, reanimated, fonts, symbols — all dead code. The transparency feature ("why these outfits") renders as a lowercase log line next to a raw float. The capture flow breaks the 3-minute promise on item #2. The learning loop never reaches the worker — and where it does, the worker double-signals the pick and learns at 65% power. The deployed API has cross-tenant write and account-takeover holes.

**The 1000x path is not new architecture. It is: mount the soul, humanize the surface, close the learning loop, fix the math, lock the door.** Concretely, eleven tasks (T-011…T-021 below). Tier 1 = the product becomes what it promises; Tier 2 = it feels designed; Tier 3 = it retains; the rest = it survives contact with real users.

---

## 1. What's already good — don't break these

- **Copy voice in onboarding and moments** — `onboarding.tsx:67-68,101-102`, `capture.tsx:169`, `item/[id].tsx:153`, `index.tsx:124`. The app *can* sound like a person. This is the brand.
- **Design token discipline** — `packages/design/src/tokens.ts`: one accent, warm neutrals, 8pt grid, one radius language. Real and mostly enforced.
- **Capture engineering** — cutout pipeline with coverage notes, graceful full-photo fallback, camera-ready gating, retry (`capture.tsx:46-92,265-314`). Honest failure handling most apps lack.
- **Today empty states** — three contextually differentiated bodies incl. demo wardrobe (`index.tsx:128-145`). Best copy in the app.
- **Engine honesty** — season fallback, always-≥3 options, signature dedupe, exploration that ramps with confidence, never throws on degenerate input (`engine/src/index.ts`). The math has taste.
- **Privacy kept real** — photos on device, no dark patterns, corrections-by-tap as a design value.
- **Test culture** — engine suite incl. 1,000-user uniqueness property test; worker happy-path; CI pair runs in ~25s.

## 2. Root cause: built but never mounted

| Feature | Exists in | Missing in UI |
|---|---|---|
| Tone engine ("pick one, bestie", genz/millennial banks) | `engine/src/tone.ts`, worker `/v1/tone`, `lib/api.ts:109` wrapper | **zero call sites**; onboarding collects no free text, so detection is impossible |
| "Never mix" personal rules | `engine/src/color.ts` consumes them; schema field exists | no UI creates one (long-press reason spec'd in PLAN.md:112); the one personal reason string is unreachable — it rides a `-Infinity` disqualification (`color.ts:109-110`) |
| Mood context | `RecommendContext.mood` schema | hardcoded `"none"` (`lib/local.ts:122`); engine ignores mood even when set |
| Suggestion/learning telemetry | `logSuggestion` (`lib/db.ts:176`), worker `/v1/learn` | never called; **worker never receives any data from the app** |
| Corrections flywheel | `garment.corrections` schema + sync shape | no edit path writes a correction (spotted independently as T-008) |
| Wear history | `wear_log` table written on every pick | no screen reads it |
| Accessories | `candidates.ts:34` generates them; schema + SLOT_MASS 0.3 | engine never attaches — dead plumbing |
| Nickname, name, city | schema `nickname`; onboarding saves name/city | name never used, city never read ("City (for weather)" — weather is GPS) |
| Dark tokens | `tokens.ts:23-30` | zero imports; `app.json` says `automatic` → dark phones get a jarring light app |
| reanimated, expo-font, expo-symbols | in `package.json` | zero imports |
| Spaced fun polls | promised PLAN.md:130 | nothing anywhere (schema/engine/worker/app) |
| `docs/TONE_KEYS.md` | referenced `tone.ts:15` | file doesn't exist |

**Pattern:** engine and schema run ahead of the app; the product ships maybe 30% of its soul. Every task below is mostly mounting, not building.

## 3. The three decisive moments (PLAN.md:190 — "build first, polish hardest")

**Onboarding — close on copy, fail on form.** The promise ("No account. No cloud photos.") is buried at 13px. Progress dots are near-invisible (`onboarding.tsx:125`), steps hard-cut, inputs stock. Asks your name and never says it back. The free-text field that would let the app learn to talk like the user doesn't exist — so the entire persona layer starves at the source.

**Capture — the best engineering, the worst flow.** Tag review is six dense attribute cards; fixing one chip means scrolling past 200px of options. `Retake` is below the fold under a monospace debug log. Save errors are *invisible* (`capture.tsx:112` sets a stage string the review branch never renders). Worst: after save it dumps you into Wardrobe (`capture.tsx:109`) — a 30-item setup is 30 camera→review→save→wardrobe→tab cycles. The 3-minute promise dies on item #2.

**"Why these outfits" — absent.** Spec: expandable rule list, long-press → never-mix. Shipped: top-3 reason strings joined " · " in one caption next to the raw score `1.23` (`index.tsx:151,167-173`), where the strings include `"rotation ok"`, `"occasion neutral"`, `"weather fit"` (`rules.ts:281,328,248`). ~44 stock templates, zero per-user variation. This is the feature that distinguishes StyleMe from every clone, and today it looks like a logcat. A user screenshots a stylist explaining *their* fit in *their* voice — not "complete outfit · weather fit".

## 4. Screen-by-screen taste notes

**Today (`index.tsx`)** — raw float score in the hero card (`:151`); "Option 1/2/3" + log-line reasons + "Worn."/"Logged it." card = a status printout, not a moment (`:120-126,147-173`); engine crash renders the "need more pieces" empty state — a lie (`:37-38`); weather silently falls back to 18°C with zero indicator (`local.ts:78-79,101`); no pull-to-refresh; shuffle logs no rejection signal (spec'd PLAN.md:185); outfit cards are flat thumbnails in a row — a lookbook app whose hero moment is a `<View>` row.

**Wardrobe (`wardrobe.tsx`)** — no loading state (blank frame, `:16-20`); filtered-empty shows the "add clothes" pitch for a 40-item wardrobe with no dresses; PLAN-promised color/status filters and "all washed" bulk absent; slot labels are raw enums; `gap: 2` breaks its own 8pt grid.

**Item detail (`item/[id].tsx`)** — loading vs not-found conflated; delete with no confirmation and zero `Alert` usage in the entire app; no wear history; no nickname; save gives no feedback; "in_use"/"retired" statuses unreachable from UI.

**DNA (`dna.tsx`)** — the trust screen is a stack of bar charts + a raw `3.4 / 5`. Honest but dashboard-y; never-mix list (spec'd) absent; re-scan failure state clears itself instantly (`:121-124`).

**Cross-cutting** — type scale is flat (30px display + 13px caption pairs everywhere; `Body` barely used); tab bar uses text glyphs `☀ ▦ ＋ ◐` while real PNG tab icons sit unused in `assets/images/tabIcons/`; zero `accessibilityLabel`/`role` in the tree (34 unlabeled color swatches); template leftovers (`react-logo.png`, `expo-badge*.png`, `tutorial-web.png`) ship in the bundle; no motion anywhere — nothing in this app would move in a screen recording.

## 5. Correctness bugs (fix regardless of taste)

1. **Worker learn loop double-signals the pick** — `offered.filter((o) => o !== pickedOutfit)` compares object identity between separately-built objects: never filters, the picked outfit gets +1 *and* −0.35; all learning runs at ~65% of intended (`worker/src/index.ts:206-224` vs `engine/src/preference.ts:63-94`).
2. Capture save failures invisible (`capture.tsx:94-116` — `stage` never rendered in review branch).
3. Today: engine error → misleading empty state (`index.tsx:37-38`).
4. Wardrobe: unhandled promise, no loading state (`wardrobe.tsx:16-20`).
5. Onboarding `finish()` has no error handling — a failed write bricks the button at `loading` forever (`onboarding.tsx:32-54`).
6. DNA re-scan failure state overwritten by `finally` before it can render (`dna.tsx:118-125`).
7. Offline weather = silent 18°C fiction (`local.ts:71-103`).
8. **Schema contract break:** `ScoredOutfitSchema.garmentIds` is `min(3)` but the engine legitimately emits dress+shoes (2 ids) on warm days (`engine/src/candidates.ts:98-102`, `index.ts:114-139`) — latent failure for any validating consumer; worker never validates output.
9. Cold weather attaches the SAME coat to every outfit, then the diversity greedy penalizes every option 0.35 for sharing it (`engine/src/index.ts:132-139,216-227`).
10. `exploreScore`: dead `*0.6…/0.6` arithmetic; exploration silently flattens when totals ≤ 0; at n=0 max kick is 0.04998 < the 0.05 flag threshold — brand-new users are never marked explored (`engine/src/explore.ts:107-114`).
11. All-in-wash returns `outfits: []` with `missingSlots: []` and no "everything's in the wash" signal (`engine/src/index.ts:241-245`).
12. Corrections never recorded on manual edits (tasked: T-008).
13. Worker never receives learn/laundry/sync events — server-side learning is dead weight (tasked: T-014).
14. Neutral-color list hardcoded in 4 places — drift hazard (`color.ts:25-46`, `explore.ts:127`, `engine/index.ts:286`, `worker/index.ts:228`).

## 6. Worker: lock the door before any real user

Deployed at `styleme-api.style-me.workers.dev`, reachable today:

- **F1 — cross-tenant garment overwrite.** Sync upsert `ON CONFLICT(id)` has no `user_id` scope (`worker/src/db.ts:64-89`); user B can clobber user A's rows. PK is global on `garments.id`.
- **F2 — unauthenticated account takeover.** `POST /v1/auth/device` requires no proof of possession (`worker/src/index.ts:66-79`); knowing a deviceId mints a 1-year JWT *and* overwrites the victim's onboarding. No revocation, no rotation.
- **F3 — zero rate limiting.** The above endpoints are unauthenticated D1 writes at will; `/v1/recommend` costs 3+ queries per call. One loop burns the daily free-tier budget.
- **F4 — `/v1/recommend` body unvalidated; zod errors → 500** (no `onError`).
- **F5 — unbounded arrays/strings** (10k-garment sync payload, uncapped embedding/id strings, arbitrary onboarding object).
- Also: sync is blind last-write-wins with an ignored `ts`, no pull endpoint, `outfits` table from PLAN never created, tone profile has no write path so `/v1/tone` is permanently bank:"none", tests mock away the multi-user scoping that would have caught F1.

Parameterized SQL throughout and correct secret handling — the fundamentals are clean; the auth/tenant model needs one hardening pass before beta: **T-019 (tenant scoping) and T-020 (auth + validation + limits + learn-bug)**.

## 7. The 1000x roadmap

**Tier 1 — Mount the soul (the product becomes what it promises)**
- **T-011 Wire the tone engine end-to-end.** Free-text capture in onboarding → `detectTone` (with word-boundary matching — today "bet" hits "better"); every canonical string through `toneText`; bank rewrite (kill the 3× "it's giving", differentiate `weather_line`, actually use "twin"/"clock it"); create `docs/TONE_KEYS.md`.
- **T-012 "Why these outfits" panel.** Expandable per-card reasons: max 3, sentence-case, human-written, occasion-aware ("rotation ok" dies); long-press → never-mix rule with visible respect ("skipped rust+pink — you said never"); raw score becomes a qualitative badge or disappears; greet by name.
- **T-013 Capture batch loop.** Stay-in-camera after save ("Added ✓ — next piece"), session progress ring, visible save errors, Retake above the fold.

**Tier 2 — Feel designed, not assembled**
- **T-015 Motion + haptics.** reanimated card entrances, shuffle transition, press feedback, expo-haptics on shutter/pick/wash; respect reduce-motion.
- **T-016 Dark mode + real icons + type + debug chrome.** Wire dark tokens via `useColorScheme`; real tab icons; custom font; ScanLog off user-facing screens into a tucked diagnostics sheet; hardcoded hexes → tokens.

**Tier 3 — Close the loop, earn the next morning**
- **T-014 Learning closure.** Today load → `logSuggestion` + queue sync; pick → `sendLearn`; "none of these" → explicit rejection signal; wash → `sendLaundry`; offline queue; honest error ≠ empty; weather fallback badge.
- **T-017 Wardrobe & item completeness.** Color/status filters, "all washed", wear-history list, nickname, delete confirmation, loading/filtered-empty states, `in_use` toggle.
- **T-018 Retention moments.** Streak celebration, first-outfit moment, spaced one-tap polls (day 3/10/30) feeding the preference vector — tone banks already contain the copy.

**Engine integrity (the math stays trustworthy)**
- **T-021 Engine integrity pass.** Per-candidate outerwear (stop same-coat + self-penalty), attach-or-delete accessories, `exploreScore` arithmetic/boundary fix, "all in wash" signal, single-source neutral list, consume-or-delete mood/occasion fields, test hygiene (tautologies, can't-fail rng assertions, missing coverage incl. `blendWeights`).

**Security (parallel, before beta)** — **T-019** tenant scoping + multi-user test; **T-020** device-proof auth, rate limiting, validation + `onError`, payload caps, `/learn` double-signal fix, schema `min(2)` fix.

**Already tasked by others** (complementary, keep): T-002 device verification, T-006 worker AGENTS.md, T-008 corrections persistence (the flywheel's fuel line), T-009 background-invariant training (the tagger's next leap), T-010 question-board duty.

### Priority order for claiming

1. T-012, T-013 (the two decisive moments that don't exist yet)
2. T-019, T-020 (deployed attack surface + learning math)
3. T-011, T-014, T-021 (voice + learning + engine integrity: the retention engine)
4. T-015, T-016 (feel)
5. T-017, T-018 (depth)

Taste rule for everyone: **the engine reasons and tone banks are the product's voice — route every user-facing string through the same human + tone pass.** If a string wouldn't be said out loud by a stylish friend, it doesn't ship. "rotation ok" is banned.

## 8. Definition of awesome (where this goes after Tier 3)

- Today screen reads like a friend styled you: "Cloudy 14° — navy + cream again? Clock it. The loafers keep it office-safe."
- Tapping "why" shows three plain sentences, any of them long-pressable into a personal rule the app visibly respects.
- Setup is a rhythmic shutter loop with a ring filling toward "30".
- Style DNA shows what it learned *this week* and asks one playful question that visibly moves a bar.
- The worker holds a synced mirror, learns server-side at full power, and survives an adversarial request.
- Every screen in dark mode, every control labeled, every interaction animated at 60fps, nothing debug-visible in production.

That is a 1000x gap from today — and every bit of it is already half-built.
