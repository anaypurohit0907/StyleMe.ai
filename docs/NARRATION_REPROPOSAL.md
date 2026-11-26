# Narration layer — concrete re-proposal

**For Anay's yes/no.** Two-minute read. The rule: **every async action gets one honest line — past-tense when done, in the app's own voice.** Nothing silent, nothing verbose. The proven templates already shipped: the 403-recovery card and the "offline guess" weather tag — this proposal applies that pattern to the six remaining silent moments.

**No new screens. No engine changes. Pure copy + state lines, tone-voiced (classic default, genz/millennial variants exist in the banks).**

---

## The examples

### 1. Capture — stage overlay (Add tab)
- **Moment:** photo taken → cutout → tagging (~3–6s).
- **Today:** "Cutting out garment…" → "Tagging cutout…" (technical stage labels, then silence).
- **After:** "Finding the piece…" → on success: **"Tagged — check me."** (genz: "tagged, clock it")
- **Placement/duration:** same busy overlay, one line, ends with the success line for ~1.2s before the review card.
- **User's next move:** reviews chips, already told the machine finished.

### 2. Capture — save
- **Moment:** "Add to wardrobe" tapped.
- **Today:** button spinner, then router.replace to Wardrobe — no words at all.
- **After:** "Added ✓ — it's in the rotation." stays with the "Added ✓" chip (copy already exists in banks as `save_confirmation` — it just isn't rendered as a sentence anywhere).
- **User's next move:** keeps shooting; knows it landed.

### 3. Re-scan — DNA progress (Style DNA tab)
- **Moment:** "Re-scan wardrobe tags" running, one item at a time.
- **Today:** button label "Re-scanning 4/7 · tagging…" — progress trapped inside a button.
- **After:** a one-line caption under the button, past-tense per item: **"Checked 4 of 7 — the black tee came back t-shirt."** On finish: **"Re-checked 7 pieces in 49 seconds. Your 5 corrections stayed put."** (the second sentence only when corrections exist and were preserved; otherwise stop at the time)
- **User's next move:** trusts the re-scan because it reported what it did.

### 4. Sync — wardrobe mirror (Wardrobe header)
- **Moment:** app online, queued events draining to the worker.
- **Today:** completely invisible. (The queue exists — T-014 — but no surface says so.)
- **After:** one quiet caption in the Wardrobe header, present only while draining, gone after: **"Saving your tags…"** → **"Tags saved just now."** for ~2s, then disappears. Offline: **"Held on this phone until online."** Photos never leave the phone — the line must never imply a photo backup.
- **User's next move:** none — that's the point; it's reassurance, not a task.

### 5. Laundry cooldown (item sheet)
- **Moment:** user taps "I washed it — back in rotation".
- **Today:** status flips to "available", nothing else.
- **After:** "Back in rotation — it rested 2 days." (the number from `lastWornAt`, real). Reverse case on "Send to laundry": **"In the wash — I won't suggest it."**
- **User's next move:** sees the system respect the wash, the promise made in onboarding kept.

### 6. First-run gap (Today, empty wardrobe)
- **Moment:** brand-new user opens Today before photographing anything.
- **Today:** "Need a few more pieces." + two buttons (good, but static).
- **After:** same card, one warmer line added: **"Photograph three pieces and outfits appear here."** — sets the mechanic in one sentence, with no false delay.
- **User's next move:** taps Add with an expectation, not a hope.

### 7. Streak milestone (Today)
- **Moment:** 3rd consecutive day with a logged wear.
- **Today:** silence (streak logic shipped in T-018, celebration only fires at pick-time).
- **After:** greeting line that morning: **"Three days in a row — this is becoming yours."** (classic; genz: "three-day streak, iconic")
- **User's next move:** none needed; the streak was *noticed*.

### 8. Poll answered (Style DNA)
- **Moment:** user taps a poll answer.
- **Today:** bar updates silently (polls shipped T-018).
- **After:** **"Noted — you lean toward solids."** one line, 2s, echoes their actual answer.
- **User's next move:** sees the answer land somewhere real.

### 9. Shuffle after "none of these" (Today)
- **Moment:** user taps "None of these? Shuffle" (a rejection signal, learned since T-014).
- **Today:** cards swap silently.
- **After:** **"Noted — another one."** (or "three new ones" only when three cards were shown) — acknowledges the rejection was heard, 1.5s. The count must match what was actually offered (T-067 depth mode shows one).
- **User's next move:** trusts that passing on outfits does something.

### 10. Cold-launch sanity (app open, Today)
- **Moment:** app opens, data loads (~300–800ms).
- **Today:** "Styling three options…" spinner card.
- **After:** same spinner, honest line instead: **"Waking your wardrobe…"** — human subject, same duration, zero extra wait.

---

## Two before/after diffs (the value, no jargon)

**Diff 1 — the wash cycle, today vs after:**
> Today: tap "I washed it" → status chip changes. Silent.
> After: "Back in rotation — it rested 2 days."
> Why it matters: the app *promised* in onboarding never to suggest in-wash items. This is the promise being visibly kept — the single cheapest trust win in the list.

**Diff 2 — re-scan, today vs after:**
> Today: progress inside a button label; result = grid silently rewrites itself. (This exact silence produced "what's happening?" three times in one morning.)
> After: "Checked 4 of 7 — the black tee came back t-shirt." → "Re-checked 7 pieces in 49 seconds. Nothing changed without you."
> Why it matters: the morning confusion is answered in the moment it occurs, in the app's voice.

---

## Build reality (if yes)

- **Files:** `capture.tsx` (1–2), `dna.tsx` (3), `wardrobe.tsx` (4), `item/[id].tsx` (5), `index.tsx` (6,7,9,10), `dna.tsx` polls (8), + ~6 new tone keys (`narrate_*`) in `engine/tone.ts` + `docs/TONE_KEYS.md`.
- **Effort:** one focused session; ~120 lines total, half of it copy already written in the banks.
- **Risk:** copy discipline only — my gate checks every line for the read-aloud rule. Zero logic changes; every number quoted (days, counts, seconds) comes from existing state.
- **Sequencing:** T-066/T-068 are merged; T-067 and T-071 also touch `index.tsx`/`dna.tsx`, so land after those or rebase. Independent of them otherwise.

---

## The yes/no questions (Anay)

- **Q1 — Capture + re-scan lines (examples 1–3):** ship? yes/no
- **Q2 — Sync "backed up" reassurance (example 4):** ship? yes/no (this one pairs with the export button T-066 — if export is yes, this is its voice)
- **Q3 — Lifecycle moments: wash-rested, first-run promise, streak morning, poll echo, shuffle-noted, wake-line (examples 5–10):** ship all, or name any to drop?

Answer per group; build starts on the yeses, and anything you name gets dropped without appeal.
