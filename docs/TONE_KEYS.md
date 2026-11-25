# Tone keys — canonical copy

Every user-facing string that should be able to speak in the user's voice
renders through `toneText(key, profile)` from `@styleme/engine` (offline,
instant). The worker `/v1/tone` is optional enrichment, never required.

Rules:

- **One key per surface.** Screens never hardcode flavored copy.
- **All banks cover every key.** `classic` is the fallback; a missing key
  falls back to the key itself (a bug — add it to all banks).
- **Intensity is probabilistic.** `toneText` uses the profile's `intensity`
  (0–1) to decide between the bank line and the classic line. Never every
  line; the app must not sound like a costume.
- **Detection is word-boundary based.** `detectTone(texts)` counts whole
  slang hits; two hits pick a bank, intensity scales with hits / 6.
- **Voice rules** (T-007 audit): no phrase reused across keys; "honestly" is
  millennial, not genz; genz keeps "twin" / "clock it" in rotation; weather
  copy differs per bank.

## Keys

| Key | Surface | genz | millennial | classic |
|---|---|---|---|---|
| `pick_one` | pick/CTA | pick one, twin | pick your vibe | choose today's outfit |
| `not_today` | skip/empty | not today — no cap | not today, honestly | none of these today |
| `today_outfit` | Today header | today's fit, served | today's look | today's outfit |
| `why_these` | why-panel | clock it — here's why | the thinking behind it | why we picked these |
| `in_laundry` | wardrobe status | it's in the wash, fr | it's in the laundry | currently in the laundry |
| `washed_back` | wardrobe status | back from the wash, fresh | fresh from the laundry | returned from the laundry |
| `wardrobe_ready` | wardrobe header | wardrobe locked in | wardrobe's set | your wardrobe is ready |
| `wardrobe_empty` | wardrobe empty | empty rack — let's cook | your wardrobe's waiting | nothing here yet |
| `new_item_added` | capture save | new piece, added | added to your rotation | added to your wardrobe |
| `save_confirmation` | capture save | saved — it's in the rotation | saved to your rotation | saved to your wardrobe |
| `gap_suggestion` | wardrobe gap | your wardrobe needs this | your wardrobe could use this | a gap your wardrobe could fill |
| `streak` | retention | you're on a streak, iconic | consistency streak — lowkey impressive | consistency streak |
| `first_outfit` | first pick | first fit logged — it's only up from here | first outfit's in the books | your first outfit is logged |
| `poll_invite` | Style DNA polls | quick taste check, twin | one quick thing | one quick question |
| `weather_line` | Today weather | clock the weather | quick weather check | weather |
| `greeting_morning` | Today greeting | morning | morning | morning |
| `greeting_afternoon` | Today greeting | afternoon | afternoon | afternoon |
| `greeting_evening` | Today greeting | evening | evening | evening |
| `fresh_rotation` | Today reasons | fresh rotation, nothing worn this week | fresh rotation, nothing repeated this week | nothing repeated this week |

## Usage

```ts
import { detectTone, toneText } from "@styleme/engine";

const profile = detectTone([freeText, name]);
const copy = toneText("save_confirmation", profile, garmentId);
```

Pass a stable `seedKey` (item id, outfit signature) so the same surface does
not flip between flavored and classic copy on every render. The tone profile
is stored locally under `meta.toneProfile`; onboarding seeds it from the
optional free-text answer.
