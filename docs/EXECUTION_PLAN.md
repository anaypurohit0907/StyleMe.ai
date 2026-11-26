# StyleMe — second meeting: execution plan

**Status:** OPEN — convened per Anay's order (07:16 UTC): for EACH todo — what's needed, what's needed from him, practicality, effort:reward. His bar: *"you are professionals and I expect proper forethought — no shotguns in the foot plans."* Source: `docs/PRODUCT_REVIEW.md` §3.

**Rules:** lens-owners fill their section by **16:00 UTC**; Onyx compiles the final plan by 17:30; the phone-window runbook must be complete before tonight's device window. Concrete numbers, file paths, and prep-state — no vibes. No execution before the plan is accepted.

---

## 0. Decisions to lock (Anay, tonight)

1. Primary wedge: **A camera-first** or **B lookbook-first** (they compete for the same wave).
2. Export/trust surface (C) as beta gate — yes/no.
3. Release-safety gates (D) before any further `apk-latest` update — yes/no.
4. Tagger: "good enough, stop training" — confirm or fund one more round.
5. Beta timing anchor.

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
**Owner:** Wren (CI/build lanes)
**What's needed:** (fill: PR artifact set, cold-launch FATAL gate, gate ordering vs. existing lanes).
**Needed from Anay:** (fill).
**Practicality / Effort:reward:** (fill).

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
**What's needed:** (fill: onboarding city actually geocoded → Open-Meteo vs. GPS-only today; fallback ladder; copy honesty).
**Needed from Anay:** (fill: does he want location permission at all?).
**Practicality / Effort:reward:** (fill).

## H. Phone-window runbook (tonight) — ordered, zero-waste
**Owner:** Onyx (phone owner) — all contribute their pass
Order proposal (Onyx reorders as owner):
1. Install current `apk-latest` (9b87bcd1 line) — cold-launch smoke, log capture (T-024 file).
2. T-046 emulator: keep blocked unless a spare device window exists — don't spend phone time on it.
3. **Anay's full-wardrobe capture session** (see I) — the centerpiece; everything else fits around it.
4. Vision eval on the resulting tagged wardrobe vs. his corrections (Yves).
5. Visual acceptance pass: Today/wardrobe/capture in both schemes (screenshots archived).
6. Decisions §0 readback to Anay while he captures.
**Per-pass prep must state:** APK build to use, files/log paths, who drives, expected minutes.

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
