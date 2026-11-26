# StyleMe — second meeting: execution plan

**Status:** OPEN — convened per Anay's order (07:16 UTC): for EACH todo — what's needed, what's needed from him, practicality, effort:reward. His bar: *"you are professionals and I expect proper forethought — no shotguns in the foot plans."* Source: `docs/PRODUCT_REVIEW.md` §3.

**Rules:** lens-owners fill their section by **16:00 UTC**; Onyx compiles the final plan by 17:30; the phone-window runbook must be complete before tonight's device window. Concrete numbers, file paths, and prep-state — no vibes. No execution before the plan is accepted.

---

## 0. Decisions — locked 07:16 UTC, remaining picks in QUESTIONS Q-006

**Locked by Anay:**
1. **Export/trust surface (C): APPROVED — build it** (T-066; C2 default, share sheet).
2. **Wardrobe-depth activation (F): APPROVED — on the todo list** (T-067; quiet tone default).
3. **Release safety (D): APPROVED — non-negotiable**, Onyx owns it (T-070; tier 1+2 shipped).
4. **City-weather (G): ORDERED** — city at onboarding, weather from it, no repeated location permission, no always-on location (T-068).
5. **Tagger: stop training** — revisit after real users; no more rounds now.
6. **Kill list:** social/trends/outfit-rendering deferred; engine sophistication deferred; stable core first.
7. **Camera-first (A): plan only** — no code until Anay approves §A.
8. **Narration (E): re-proposal only** — concrete screen/moment/copy examples before any build (T-069).

**Still open:**
- Primary wedge: **A camera-first** or **B lookbook-first** (they compete for the same wave).
- Beta timing anchor.
- Q-006 defaults (export C2/destination, depth meter placement, city permission removal, §A thresholds) — defaults proceed unless Anay overrides.

## A. Camera-first first run + confidence-gated capture
**Owner:** Yves (capture/vision) · **Co:** Sable (owner-demo reality)

**What's needed:**
- Flow: after onboarding vibes, land in **Add** with the camera armed and a 3-piece
  goal ("top + bottom + shoes", or dress + shoes), not the full 30-piece grid.
  Keep the T-013 loop: capture → cutout → one compact confirmation → "Added ✓" →
  camera re-arms; no bounce to Wardrobe.
- Review surface: a **single slot row** (6 chips, current guess preselected) plus
  Retake. Do not show six attribute cards at capture; color/pattern/formality move
  to the item sheet. This is the "we guess, you confirm" promise, not auto-tagging.
- Confidence gate (uses shipped logits/mask coverage, no retrain):
  - slot conf >= 0.60 and mask coverage 0.08–0.65 → quiet confirmation row.
  - slot conf < 0.60 or coverage < 0.08 or > 0.65 → "Check this one" banner + Retake
    hint; still one tap to accept. Evidence: real flat-lay test had 0.48–1.00
    confidence with both correct and wrong calls at 0.9+, so confidence alone must
    not auto-save.
  - `cover > 0.65` with `useMask=false` → keep full photo but tell the user the
    background is busy; no hidden failure.
- Session ring: 3-piece minimum, then "3 pieces → first outfit ready"; 30-piece
  target remains a later goal, not a gate.
- Copy: "One piece per shot. We'll guess; you confirm." Replace any "automatic"
  claim on Capture/Onboarding.
- Metrics emitted locally: shots taken, time to first outfit, confirmation taps,
  retakes, corrections. Reuse T-058 funnel counters; no network.

**Needed from Anay:**
- Approve the 3-piece minimum and the one-row confirmation (vs. full editor now).
- Confirm the default thresholds (0.60 / 0.08 / 0.65) are acceptable to tune on his
  own wardrobe session.
- Confirm time budget for first outfit (target ≤ 90s after onboarding).

**Practicality / Effort:reward:**
- Effort: ~4–6h mobile (one focused session) + copy; no model work, no new deps.
  Reuses cutout, slot logits, coverage, T-013 loop, funnel counters.
- Reward: high — directly targets the 3-minute promise and the 5/8 first-guess
  reality. Risk: one extra confirmation tap per piece; mitigated by showing the
  compact row only (not the full tag editor).
- Success metrics: capture ≤ 10s/piece, correction rate ≤ 1 in 4, first outfit
  completed by ≥ 80% of testers without asking "is it done?".

## B. Lookbook-first Today + honest degradation
**Owner:** Viv (design) · **Co:** Marlow (engine gates)
**What's needed:** three bounded changes, no engine/model work:
1. **Hero + peek, not three equal forms** in `apps/mobile/src/app/(tabs)/index.tsx`:
   one large photo-led outfit card (garment names, one “why” disclosure, one
   primary action), with options 2–3 as compact peek cards/tabs. Keep the
   existing 3 offers; nothing changes in `recommend()`. Move the raw
   score/badge treatment behind the “why” disclosure.
2. **Photo-coverage fallback** in a new `apps/mobile/src/components/garment-thumb.tsx`
   used by Today/Wardrobe: when `photoRef` is empty, render a token-styled
   garment silhouette + slot label instead of a flat color swatch; when <50%
   of a candidate outfit has photos, show one quiet “add photos for this look”
   line, not fake imagery. The current 14-piece/test screenshots are mostly
   color blocks (one real photo in 14 tiles) — this is the first-impression
   trust bug.
3. **<15-piece register shift** in the same Today file + `gapAnalysis`:
   replace the generic “need a few more pieces” empty card with the top 1–2
   concrete gaps (“a second bottom unlocks 6 looks”), keeping
   `gapAnalysis()` as the single source; no new math, no pushy commerce.
   Degradation states stay honest: engine error ≠ empty; no photos ≠ error;
   laundry-empty keeps the existing recovery card.
**Prep-state (updated 09:30 UTC):** T-067 slice 1 is merged and already ships
depth-mode one-card + badges hidden below 60% photo coverage in `index.tsx`. If B
is chosen, session 1 must **replace that card shell**, not add a second Today
layout; keep T-067's depth line + `gapAnalysis` below the hero. If A wins, B
defers and T-067 stands alone.

**Needed from Anay:** pick the wedge (A camera-first vs B lookbook-first);
approve the photo fallback as “designed absence” rather than a photo-required
gate; confirm that one hero + two peeks is still “3 outfits” for the product
rule; and make the full-wardrobe capture session available for the before/
after screenshot eval.
**Practicality / Effort:reward:** **Medium, 2 focused sessions (~6–8h) + one
device screenshot pass**: session 1 layout/peek + why disclosure, session 2
fallback thumb + gap empty state, QA on his real 30-piece wardrobe. No schema,
worker, engine, or dependency changes; risk is taste/photo coverage, not
correctness. Reward is high because Today is the product’s first and most
repeated screen and the current equal-card/photo-block state reads as
unfinished; this is the cheapest way to make the existing engine feel like a
stylist. Rank: 2nd after narration (E), ahead of camera-first until the plan
for A is accepted.

## C. Trust surface: "your closet lives here" + export
**Owner:** Indigo (data/worker)
**What's needed:** one "Save a backup" action + one copy line, so the app's #1 signal (irreplaceable data, Q-002: "I can't keep re-rating all of them") is answered with a mechanism, not a promise. Concretely:
1. **Entry:** Diagnostics card (Style DNA) gets a "Backups" row + Wardrobe header gets one quiet line — draft copy by Vesper ("Your closet lives on this phone — export a copy."). No new screen required for v1.
2. **Export content (read-only from the app's side, can never corrupt the source):** `manifest.json` (schema version, counts, timestamps), full wardrobe rows incl. attrs + corrections + subtypes, `wear_log`, prefs/explore state, streak/retention meta, onboarding answers, and the photo files (`photoRef` targets, ~200–500 KB per item at current capture scale — a 14-item closet ≈ 5–10 MB, a 100-item closet ≈ 30–50 MB, runtime seconds). **Never** the auth token/registration secret.
3. **Two implementation options:**
   - **C1 — folder export, zero new dependencies:** `expo-file-system` SAF `requestDirectoryPermissionsAsync()` → user picks a folder (Documents/Drive) → write `styleme-backup-YYYYMM-DD/` with manifest + JSON data + `photos/`. ~150 lines, one session (~2–3 h incl. verification).
   - **C2 — single zip + share sheet (recommended):** `jszip` (pure JS, no native code) + `expo-sharing` (native module, rides the next APK) → one `styleme-backup-YYYY-MM-DD.zip` through the share sheet straight to Drive/Downloads/WhatsApp. ~200 lines, +1 dep, ~1 extra hour over C1. One file is what a user understands; recommend C2, with C1 as the fallback if the dep is unwanted.
4. **Verification protocol:** run on Anay's 14-item wardrobe tonight → `adb pull` the backup → assert manifest counts == wardrobe counts, photos byte-identical, corrections present (5 known user corrections must be in the dump).
5. **Honest scope line:** export is insurance, not sync. Restore = copy files back to the same phone after reinstall; no cross-device import in beta. The copy must not imply otherwise (Vesper gate).
6. **Tie-in:** the wardrobe-session end screen (section I) points at this surface — "this taught the model, and here's where your data lives."

**Needed from Anay:** (1) pick C1 or C2 (or "C2 if the dependency is clean"); (2) where backups should land by default (Downloads? Drive?); (3) pick one of Vesper's 2–3 copy drafts for the promise line. Nothing else — no accounts, no cloud, no cost.

**Practicality:** high — everything is local, structured, and already proven writable externally (T-036 `Directory.createFile` evidence, T-024 `styleme.log` pull works). **Effort:reward: best-in-class for its size** — one session of work retires the single biggest data-safety fear of the only real user; no infra, no server, no maintenance.

## D. Release safety: screenshot-on-PR + `apk-latest` cold-launch gate
**Owner:** Wren (CI/build lanes) · filled

**What's needed — three tiers, in gate order:**

1. **Publish-path hardening (do regardless, ~1–2 h, no new infra):**
   Reorder `.github/workflows/android.yml` so the `apk-latest`/`aab-latest`
   upload steps are the LAST steps and cannot run unless everything before
   them passed: CI test pair, tsc ×4, eslint, **`npx expo export --platform
   android`** (new required step — catches the unresolvable-module class that
   shipped tonight, e.g. the encoder-missing `Unable to resolve
   mobileclip_s1_image.onnx` failure), the vision-bundle fetch assert
   (`ls` every file the tagger `require`s after the `vision-v2` curl — zero
   cost, would have caught the emulator-lane failure exactly), and the APK/AAB
   build. Then move the upload steps behind a GitHub
   `environment: production` with **required reviewers (Onyx + Anay)** —
   a release asset cannot publish without a human approve. Anay's 07:16 words
   make this the non-negotiable core: broken software must not reach
   `apk-latest`.
2. **PR-lane (cheap, works today, ~1 h):** on every PR touching
   `apps/mobile/**`, build a **branch APK artifact** (ubuntu x86_64 debug
   build is green in ~8 min — proven on Coco's T-061 dispatch). Vision-capable
   reviewers install from the artifact when judging UI PRs instead of
   serializing the phone; `apk-latest` stays release-only. NOTE the honest
   limit: hosted-PR **screenshots are not possible** — all six hosted
   emulator configs failed (T-046 evidence file: local QEMU segfault,
   ubuntu no-KVM, macos-13 retired, macos-15-intel dies post-boot, arm64
   never connects); only a real device renders our app.
3. **The real cold-launch gate (the actual decision):** FATAL-at-boot and
   glass-class bugs ship invisible to every hosted check — tonight's crash
   had green tests + tsc + eslint + export. Two options for Anay:
   - **D-a Self-hosted KVM runner (~US$20/mo small x86 box):** proven
     bootable stack (API 30 AVD, 338–841 s boot, `--no-streaming` install)
     from tonight's evidence, just not on hosted silicon. One-time setup
     ~2–3 h (runner registration + the existing `emulator.yml`). Then every
     push gets install + cold-launch + `adb logcat` FATAL scan +
     **screenshots into the run** automatically — the screenshot-on-PR from
     my proposal becomes real, and the phone stops being the pipeline.
   - **D-b Phone-first (status quo, zero cost):** tonight's §H runbook —
     first install after every merge is the cold-launch gate, one owner,
     expected 10 min/device window. Honest cost: releases serialize on
     Anay being home.

**Implemented 07:35–10:10 UTC (Onyx, lead):** push builds are artifacts only;
`apk-latest`/`aab-latest` publish is a separate manual `publish.yml` workflow
that downloads the **exact artifacts from the verified run** (never rebuilds)
behind `environment: production`; the same Android run gates on
typecheck ×4, engine+worker tests, mobile lint, vision-bundle assert, and
`expo export --platform android`; CI adds mobile lint; the workflow also runs on
PRs and uploads arm64 APK/AAB artifacts (no publish); `.githooks/pre-push`
(`npm run hooks:install`) gates code pushes locally. `production` is configured (required
reviewer Anay, self-review blocked, admin bypass disabled). Remaining: the
required-checks/PR-flow decision; cold-launch stays phone-first until a KVM
runner exists.

**Needed from Anay:**
- (1) Approve required-checks + `environment: production` on the upload steps
  (needs repo admin — his click), and name the required reviewers.
- (2) Pick D-a (fund the runner) or D-b (phone-first interim). D-a is my
  recommendation; it retires the single biggest process tax found in the
  product review and makes the vision-gate async.
- (3) Confirm no more direct pushes to `apk-latest` outside the workflow
  (tonight's manual restore was correct firefighting; make it policy).

**Practicality / Effort:reward:** Tier 1 is a no-brainer — hours, zero infra,
kills the crash-asset-served-to-phone class outright. Tier 2 is cheap and
unblocks UI review throughput today. Tier 3 is the only real spend decision;
effort:reward for D-a is the highest on this page (one small box converts
the most expensive, most repeated bottleneck in the product review into a
background job).

## E. Narration layer — re-proposal (Vesper, filled)
**What's needed:** one honest line per async action, past-tense on completion, tone-voiced via existing `toneText` keys + ~4 new ones (`capture_step_*`, `sync_state`, `scan_done`, `cooldown_note`). Surfaces: capture overlay stages (extend existing `stage`), re-scan progress (dna), sync-queue drain (wardrobe header, one line), laundry cooldown (item sheet). Pattern is already proven: the 403-recovery card + "offline guess" tag. Pure copy + state surfacing; no new screens, no engine changes. **Effort: small (≈1 focused session). Risk: copy discipline only — my gate enforces the read-aloud rule. Practicality: high — every piece exists (tone engine, stage state, T-024 structured log as the source of truth for states). Effort:reward: best in the list — smallest diff against the #1 measured pain (3 "what's happening" asks).**
**Needed from Anay:** nothing.

## F. Wardrobe-depth-first activation
**Owner:** Marlow (engine/utility) · **Co:** Sable
**What's needed:** mobile-only surface work; **zero engine/worker/schema changes** (engine sophistication is deferred per the kill list — the "unlock" math is arithmetic on the local garment list, not engine work). All inputs already shipped: T-030 wardrobe-size guess (`metaGet("wardrobeSize")`, clamped 10–60, default 30), T-052 `gapAnalysis()` (pure, exported), T-013 `Progress` ring (in `ui.tsx`), T-017 wardrobe header.
1. **Wardrobe health meter** — `apps/mobile/src/app/(tabs)/wardrobe.tsx`: header caption ("N pieces · M in wash") gains the `Progress` ring toward the size-guess target + one gap line: "18 of ~30 · 3 more bottoms → 6 fresh combinations." Math, honestly: pair-shape combos = tops × bottoms × shoes + dresses × shoes; delta from +k of the gap slot (gap slot + k from `gapAnalysis`) — computed in a small mobile helper, labeled **combinations**, never "looks" (cooldowns mean new ≠ immediate; taste gates final copy).
2. **Today depth line + register shift** — `apps/mobile/src/app/(tabs)/index.tsx` (co-owned with B): below 15 photo'd pieces → 1 strong option + honest depth line instead of 3 near-twins; badges (`OutfitBadge`) hidden when photo coverage <60% — all gates on data the screen already holds (`listGarments` + `photoRef`), no new fetch. If B wins the wedge, this line rides B's layout wave rather than racing it.
3. **Copy keys** — 2 new tone-bank keys (`depth_line`, `depth_goal`), Vesper gates; files: `apps/mobile/src/lib/tone.ts` + `docs/TONE_KEYS.md`.
**Needed from Anay:** (1) goal framing — his size-guess as the visible target vs a fixed 30; (2) meter on Today too, or Wardrobe-only; (3) pressure ceiling — Sable's lens says status confusion is the #1 pain, the meter must never read as homework (his call on "nudge vs quiet").
**Practicality / Effort:reward:** Practicality: high — every input shipped, additive UI only, no deps. Effort: **small — ≈1 focused session** (helper + meter + gates + copy; `wardrobe.tsx`/`index.tsx`/`local.ts`/`tone.ts`). Reward: high — it attacks the activation cliff (my proposal §2: at ~8 real pieces the engine's 3 options are near-twins and the setup promise is the product's most expensive assumption). Risk: low, taste-gated. Anay pre-approved the direction this morning ("wardrobe-depth activation — add to the todo list"). Sequences cleanly: F has no dependencies; its Today-side piece shares B's files, so F+B should be one wave if both are picked.

## G. City-weather (honest weather source)
**Owner:** Sable (user-proxy) · **Co:** Wren

**Co input — Wren (filled; the code side):**
- Today's reality: `getWeather()` (`apps/mobile/src/lib/local.ts`) requests
  **foreground location permission on every Today load**, races it with a
  2.5 s timeout, then GPS + Open-Meteo by lat/lon; any miss falls to the
  18 °C "offline guess" (tag shipped in T-014). That permission prompt is
  Anay's battery complaint, and it's the one permission the app asks that
  the product doesn't actually need.
- The fix, no new deps: Open-Meteo ships a **free geocoding API, no key**
  (`https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`).
  Onboarding already collects `city` and persists it (meta `city`) — resolve
  it once at onboarding-save, store `weatherLatLon` in meta, and `getWeather`
  reads **stored coords, zero location permission, zero GPS wake-ups**. City
  edits later (Style DNA or a settings row) re-geocode once.
- Fallback ladder, all states visible: geocoded live → cached coords (if the
  geocode is offline, retry next launch) → 18 °C + "offline guess" tag. No
  silent GPS, no silent permission.
- Effort: small — one geocode helper + `getWeather` swap + one meta key,
  ~1–2 h; permission removal = drop the `expo-location` dep + the `local.ts`
  GPS path (Marlow 07:40: `app.json` has no entry; the package merge adds
  `ACCESS_FINE_LOCATION`, so the manifest entry disappears at prebuild).
  Files: `local.ts`, `onboarding.tsx`, `app.json`, `package.json`, lockfile.
- Needed from Anay (mine): none beyond Sable's copy questions; if he ever
  wants automatic local weather back, that's a separate opt-in toggle.

**What's needed (Sable, filled — user-proxy + copy-honesty side):**
- Onboarding gains one free-text **"Where are you based?"** city field (Vesper-gated copy),
  resolved by the geocode helper **once at onboarding-save**; result persisted as
  `weatherLatLon` in meta. No picker UI, no map, no permission — text + geocode, zero deps.
- **Permission policy (Anay's actual order):** the foreground-location ask is REMOVED —
  mechanics per Marlow's 07:40 verification: `app.json` carries no location entry;
  `ACCESS_FINE_LOCATION` enters via the `expo-location` package merge, so removal =
  **drop the `expo-location` dep + the `local.ts` GPS path** (manifest entry disappears
  at next prebuild; adds `package.json`/lockfile — shared hotspot — to the file list).
  The app requests **no location at all**; if Anay ever wants auto-local weather back,
  it returns as an explicit opt-in toggle that re-adds the permission, never as a prompt.
- **Fallback ladder, every state visible (extends T-014's honesty pattern):** live
  geocoded weather → cached coords (geocode offline → retry next launch) → 18 °C +
  "offline guess" tag. No silent GPS, no silent permission, no fake precision.
- **Copy honesty:** the weather line renders the **city name**, not "your location"
  ("Bangalore · 24°"), so the number is legible as what it is: city-scale weather.
  City is editable any time via a Style DNA row (one re-geocode on save; same ladder).
- **Verification via existing counters (T-058):** add `weather_live` / `weather_cached`
  / `weather_offline` local counts — proof the prompt-elimination landed and the ladder
  is honest, read from the Diagnostics card, no network.
- **Metrics that matter to the user:** zero permission prompts after install (today:
  one per Today-load), zero GPS wake-ups, identical weather output for a fixed city.

**Needed from Anay (Sable, filled):**
1. **Does he want the location permission gone from the manifest entirely** (my read
   of his order: yes — remove; opt-in toggle can re-add it later if he ever asks), or
   kept dormant in the build for a future auto mode?
2. Free-text city at onboarding OK (vs a city-picker UI — text is zero extra work)?
3. Nothing else.

**Practicality / Effort:reward (Sable, filled):** Practicality: high — Wren's code
side is 1–2 h; the field + edit row + copy is the same session. **Effort:reward: top-tier
for its size** — one session kills the app's single unnecessary permission and Anay's only
stated battery/privacy annoyance ("no fashion app should drain battery with always-on
location", 07:16), while keeping the weather feature 100% intact and making the privacy
story real: *a wardrobe app that asks for nothing*. Risk: misspelled city → geocode miss
→ covered by the visible fallback + editable field; offline first-run → cached/guess,
honest by design.

## H. Phone-window runbook (tonight) — ordered, zero-waste
**Owner:** Onyx (phone owner) — all contribute their pass. One installer, announced.

**Pre-window (no phone needed, do before Anay plugs in):**
- Confirm `main` CI pair + tsc ×4 + lint green; record release SHA.
- Confirm `apk-latest` digest + size; download the APK to the shared box
  (`/home/anay/apk-window.apk`), verify `sha256` matches the release asset.
- Pre-write the pass table below; each pass has one driver, one APK, one path.
- Phone: `adb shell svc power stayon true`; screen unlocked; dark mode as Anay left it.
- Known-good rollback: keep the last verified digest; if the window APK crashes,
  restore the asset + reinstall known-good before any other pass.

**Pass table (proposal; Onyx may reorder):**

| # | Pass | Driver | APK | Artifacts / paths | Est. |
|---|---|---|---|---|---|
| 1 | Install + cold-launch smoke (no FATAL, no `Maximum update depth`, no BlurView warning), pid stable | Onyx | `/home/anay/apk-window/app-release.apk` (run `45794733039`, `sha256 42eba813…`) | `adb logcat`, `styleme.log` via `adb pull` | 5 min |
| 2 | **Anay's full-wardrobe capture session** (section I) — centerpiece; no agent installs during this | Anay (Yves/Vesper guide) | same | session id + manifest; photos stay local | 15–30 min |
| 3 | **Export test (T-066 shipped)** — save backup, pull zip, `unzip -t`, assert manifest counts == wardrobe counts, photo bytes match, corrections present | Yves (guide) | same | export zip + `sha256sum`; no secrets | 8 min |
| 4 | Vision eval on the captured wardrobe vs corrections (read-only) | Yves | same | `styleme.log`, report JSON | 10 min |
| 5 | Visual acceptance: Today/Wardrobe/Capture/Gap + T-067 meter + T-068 city weather line, dark + light screenshots archived | Onyx + Viv | same | `/home/anay/window/*.png` | 10 min |
| 6 | T-038 SecureStore relaunch check (T-060 press-warning already closed on-device 2026-11-25) | Coco | same | relaunch + logcat | 3 min |

**Hard rules:** no concurrent installs; every install announced with digest; no
`pm clear`; no re-scan of user data unless Anay asks; if the phone sleeps or
detaches, stop and queue the remaining passes — do not restart blindly.


## I. Anay's source-of-truth wardrobe session (his order)
**Owners:** Yves (session design) + Vesper (copy/promise framing)

**What's needed:**
- Protocol: one piece per frame, flat-lay, fill the guide, natural light, no hangers
  or people. Include the real surfaces he uses (graphic bedsheet) plus at least one
  plain sheet/floor shot for an A/B if he is willing. 20–30 items covering
  top/bottom/dress/outerwear/shoes/accessory.
- Capture loop: camera-first, auto-cutout, compact slot confirm; save immediately.
  Color/pattern/formality corrections can happen later in the item sheet so the
  session stays under ~15 min.
- Persist: `originalRef`, cutout, final attrs, `corrections[]`, model prediction,
  slot confidence, mask coverage/bbox, and a session id. Export manifest JSON +
  photos via the C export surface (local-only; no upload).
- Split: by item id, 70/15/15 train/val/test; keep at least one background family
  and one hard item (patterned/dark) entirely in test. Use it as the real-photo
  eval, not a training set, until Anay opts in.
- Expected time: 30 items × 20–30s capture+confirm ≈ 10–15 min, plus corrections.

**Vesper, filled (copy side):** the session must FEEL like the product promise, not
data collection — ring progress in his size-guess, honest low-confidence questions,
zero jargon; end screen shows "this taught the model" + where the data lives
(ties to C).

**Needed from Anay:**
- 20–30 items and ~15 min; flat surface + light.
- Consent to local export (photos stay on phone/laptop; adb pull only).
- Whether captured items stay in the wardrobe after the session.
- Whether he can add one plain-background set for A/B (not required).

---

## Compile checklist (Onyx, by 17:30 UTC)
- [ ] All sections filled; gaps chased at 15:30.
- [ ] Effort:reward ranked across A–G.
- [ ] Phone-window runbook executable start-to-finish.
- [ ] Decisions §0 phrased as yes/no or pick-one for Anay.
- [ ] No task files created until plan accepted — proposals → plan → tasks, in that order.
