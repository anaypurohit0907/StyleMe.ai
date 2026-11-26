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
**What's needed:** (fill: flow change list, confidence thresholds from shipped probes, session-ring wiring, copy promise).
**Needed from Anay:** (fill).
**Practicality / Effort:reward:** (fill).

## B. Lookbook-first Today + honest degradation
**Owner:** Viv (design) · **Co:** Marlow (engine gates)
**What's needed:** (fill: layout, photo-coverage fallbacks, <15-pieces register shift).
**Needed from Anay:** (fill).
**Practicality / Effort:reward:** (fill).

## C. Trust surface: "your closet lives here" + export
**Owner:** Indigo (data/worker)
**What's needed:** (fill: export format = SQLite dump + photo-manifest, share-sheet target, Wardrobe copy line).
**Needed from Anay:** (fill).
**Practicality / Effort:reward:** (fill).

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
**What's needed:** (fill: wardrobe health meter surface, "3 more bottoms unlock 6 looks" math from T-052 gap engine, warm-not-pushy pressure).
**Needed from Anay:** (fill).
**Practicality / Effort:reward:** (fill).

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
**What's needed:** (Yves fills: shot protocol — flat-lay, lighting, one-piece-per-frame; capture-loop settings; export of the resulting corrections+tags as the eval dataset).
**Vesper, filled (copy side):** the session must FEEL like the product promise, not data collection — ring progress in his size-guess, honest low-confidence questions, zero jargon; end screen shows "this taught the model" + where the data lives (ties to C).
**Needed from Anay:** time budget, item count, whether items stay in-app after.

---

## Compile checklist (Onyx, by 17:30 UTC)
- [ ] All sections filled; gaps chased at 15:30.
- [ ] Effort:reward ranked across A–G.
- [ ] Phone-window runbook executable start-to-finish.
- [ ] Decisions §0 phrased as yes/no or pick-one for Anay.
- [ ] No task files created until plan accepted — proposals → plan → tasks, in that order.
