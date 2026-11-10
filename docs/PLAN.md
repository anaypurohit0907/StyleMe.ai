# StyleMe.ai — Build Plan v1

## Status — 11 Nov 2026

- **Phase 0/1 (scaffold + ML):** done. Engine 41 tests, worker 7 tests, notebooks 00–03 run on T4. ONNX parity 1.000.
- **Phase 2 (app):** done for MVP. Onboarding, Today (3 outfits), Wardrobe, Capture + tag editor, item detail/laundry, Style DNA; local SQLite + offline engine.
- **Phase 3 (backend):** deployed to Cloudflare: `https://styleme-api.style-me.workers.dev` with D1 migrations applied. R2 photo backup optional/disabled.
- **Phase 4 (learning/tone):** engine learning + tone banks implemented; UI uses local engine. Worker tone endpoint live.
- **Phase 5 (compat model):** Polyvore baseline produced a negative result (item CF doesn't transfer); attribute rules remain the path.
- **Distribution:** arm64 release APK built in GitHub Actions and published at `/releases/tag/apk-latest`.

Known gaps: color is classical CV (strong on solids, weak on multi-color/lighting); pattern/fit remain zero-shot; native build only via CI (local 7GB machine OOMs).



Status: DRAFT — awaiting approval
Date: 2026-11-09

## 0. Product in one paragraph

One-time setup: user photos their clothes. App tags each item on-device. Every day the core engine returns ≥3 complete outfit options built from first principles of fashion (color theory, formality, silhouette, weather, rotation), not from trending data. User's picks, tag corrections, and context (mood, occasion, weather, laundry state) continuously re-tune a per-user preference vector — so two users never converge on the same style. App voice adapts to the user (Gen Z "twin"/"clock it", etc.).

Non-negotiables:
- Photos stay on device by default (privacy is a feature).
- Zero paid infra at launch: $0/month stack.
- Setup < 3 minutes for a 30-item wardrobe.
- Engine never manipulates toward herd behavior; exploration is deliberate.

## 1. Stack decisions

| Layer | Choice | Why |
|---|---|---|
| App | React Native + Expo (TypeScript) | One codebase iOS+Android. OTA updates via EAS Update → iterate UI/copy without App Store review. Largest TS talent pool. Shares language with backend. |
| Vision | MobileCLIP (S0/S1) → TFLite, on-device | 11–22M params, ~1.5–2.5 ms on modern phones. Image embedding (512-d) + cosine similarity to prompt embeddings = zero-shot attribute extraction. No per-attribute training data needed; works offline; photos never leave device. |
| Vision enrichment (optional) | Gemini Flash (free tier), server-side, opt-in | Deep attributes when user explicitly opts in. Rate-limited + free tier may use content → off by default. |
| Core engine | TypeScript package (`packages/engine`), runs server-side | Pure math, no GPU. Testable, updatable via worker deploy without app release. |
| Backend | Cloudflare Workers (Hono) + D1 (SQLite) + R2 (photos) | Free tier: 100k req/day, 5 GB D1, 10 GB R2, no egress fees. Most generous $0 stack that fits (Vercel has no free DB). |
| Weather | Open-Meteo | Free, no API key. |
| Training | Google Colab (free T4 16 GB, 12 h sessions; also runs on Pro) | Notebooks below. Checkpoint-to-Drive every epoch so session drops are survivable. |
| Persona voice | Word-bank rules (default) + Gemini Flash copy generation (cached, rate-limited) | Cheap, fun, no per-message cost. |

## 2. Architecture

```
┌────────────────── Phone (Expo app) ──────────────────┐
│  Camera → crop → MobileCLIP (TFLite) → 512-d embed   │
│  + classic-CV dominant color (HSV→LAB quantize)      │
│  → attribute set (category, colors, pattern, fit,    │
│    formality, season) → user confirms/corrects chips │
│  → local SQLite (wardrobe) → sync to R2/D1           │
└──────────────────────────┬───────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼───────────────────────────┐
│  Cloudflare Worker (Hono)                            │
│  POST /wardrobe/sync   (items, corrections)          │
│  POST /recommend/today (occasion, mood, temp, laundry│
│                          → ≥3 outfits + reasons)     │
│  POST /laundry         (washed / in-wash transitions)│
│  POST /learn           (pick event → preference EWA) │
│  GET  /weather         (Open-Meteo proxy, cached)    │
│  GET  /tone            (cached persona copy)         │
│  D1: users, garments, outfits, wear_log, suggestions │
│  R2: garment photos (originals stay on device; R2    │
│       backup optional, encrypted)                    │
└──────────────────────────────────────────────────────┘
```

Key split: **vision = on-device**, **decision-making = server**. Engine updates ship without app review; vision runs offline.

## 3. The Core Engine (the soul of the product)

### 3.1 Item model (what vision + user produce per garment)

- `category`: top / bottom / dress / outerwear / shoes / accessory (13-class DeepFashion2 mapping collapsed to 6 slots + detail)
- `colors[]`: 1–3 dominant colors, named from a 16-color curated palette (deterministic HSV→LAB clustering, not ML — ML color naming is unreliable; classical CV is exact)
- `pattern`: solid / striped / check / floral / graphic / animal / other
- `fit`: slim / regular / relaxed / oversized
- `formality`: 1–5 (street → formal), tagged zero-shot
- `season`: warm / cool / all
- `material`: light / medium / heavy (proxy for thermal weight)
- `embedding`: 512-d (for novelty distance + future "find similar")
- `status`: available / in_use / in_wash (with `washed_at`, `available_at`) / retired
- `wear_log[]`: dates + occasion (rotation memory)

### 3.2 First-principles rule set (deterministic, explainable)

Every candidate outfit gets scored; each rule contributes a labeled score so the UI can show "why":

1. **Completeness** — outfit must fill slots: top+bottom+dress (one-piece) + shoes; outerwear if temp < 18 °C or rain. Missing hard slot = disqualify.
2. **Color harmony** —
   - neutrals (black/white/navy/grey/cream/tan) anchor any palette;
   - ≤3 non-neutral colors (60-30-10 mass rule);
   - color-temperature consistency: warm-with-warm, cool-with-cool, unless one side is neutral;
   - complementary contrast allowed only if one item is a small accent (shoes/belt/top) — scored, not banned;
   - tonal (same-hue different-lightness) always valid.
   Score from HSL color-wheel distance + saturation balance.
3. **Formality match** — target occasion has a formality band (office 3–5, date 2–4, beach 1–2, party 2–5). All items within ±1 of band center, or deliberate "smart-casual" mix (one item ±2) which scores slightly lower than clean match.
4. **Silhouette balance** — fitted top pairs with loose bottom or vice versa; oversized+oversized penalized; fitted+fitted allowed for office/sport, penalized for relaxed vibes.
5. **Pattern discipline** — ≤1 dominant pattern per outfit; secondary pattern must share a base color with the dominant; solid always safe.
6. **Weather fit** — temp bands → required material weight + layering; rain → waterproof outerwear required; > 28 °C → light fabrics, shorts valid.
7. **Rotation** — per-item cool-down (hero items ≥2 days, basics ≥1 day) since last wear; recent outfit (embedding distance to outfits worn in last 7 days) gets novelty penalty.
8. **Laundry** — hard filter: any item in_wash/laundry-excluded is excluded from candidates.
9. **Preference vector** — per-user weights learned from pick events (see 3.3): color affinities, pattern likes, fit preference, formality drift, slot habits. Multiplies rule scores; never hard-filters (keeps uniqueness + discovery).
10. **Exploration (anti-herd)** — Thompson sampling over candidates: each outfit's score has a learned uncertainty; occasionally a lower-mean candidate is served. Guarantees variety even with a small wardrobe, and guarantees two users with identical wardrobes diverge over time (their pick histories diverge → vectors diverge → candidates diverge).

Final: `score = Σ wᵢ·ruleᵢ(outfit) · (1 + α·prefᵢ) + ε_explore − β·recency_sim`, top-K (K≥3), dedupe near-identical sets (embedding distance threshold) before returning.

### 3.3 Learning loop

- **Pick event**: user picks 1 of K → full positive example. Log: outfit, context, rank offered, alternatives (negative-ish). Update preference vector via exponential moving average (α=0.15) over per-attribute contributions of the chosen outfit.
- **Tag correction**: user fixes an auto-tag (e.g., "this is not striped") → stored; corrections are free ground-truth data for future fine-tuning (notebook 02 consumes an exported corrections.jsonl).
- **Feedback on reasons**: "why these?" panel → user can long-press a reason to say "never mix this" → becomes a hard personal rule (stored as user constraint, not global).
- **Mood/occasion**: one-tap context chips each day ("today: office / date / beach / errands / lazy"). No forced diary.
- **Style DNA screen**: shows the learned vector (top colors, fits, formality) — transparent, user-overrideable. Trust = retention.

### 3.4 Compatibility prior (data-driven, trained in Colab on ABO)

Rules 2/4/5 above start as hand-encoded (interpretable, launch-day ready). In parallel, notebook 03 trains a **compatibility model on the ABO dataset** (28k outfits, 260+ attributes per item, ground-truth outfit-compatible labels; standard fill-in-the-blank + compatibility tasks):

- Model: small MLP / logistic net over item attribute one-hots + interaction terms → P(compatible). T4-friendly, minutes not hours.
- Output: exported as JSON coefficient table consumed by `packages/engine` (no ONNX needed at this scale; swap in ONNX later if we add embeddings).
- Role: **re-calibrates rule weights against real human-labeled outfits** and provides the fill-in-the-blank scoring (given top+dress, which of the user's bottoms fits best). Rules remain the interpretable layer; ABO model tunes them. This is "first principles learned from data", not trend following.
- Uniqueness invariant tested in CI: simulate 1,000 synthetic users (random wardrobes + pick dynamics) over 90 days → assert pairwise style-vector diversity stays high (Gini / embedding-distance metrics).

### 3.5 Persona / tone engine

- Onboarding captures: age band (optional), vibe words, and the user's free-text where they type.
- Vocab detector: n-gram frequency of the user's text vs slang banks (genz: "twin", "no cap", "clock it", "it's giving"; millennial: "vibe check", "lowkey"; classic: none) → tone profile {bank, intensity}.
- Copy layer: every user-facing string passes through the tone engine → word-bank substitution (default, instant, offline) + optional Gemini Flash one-line rewrites for special moments (first 3 outfits, streaks, milestone days), cached per user per day. Free-tier RPD respected server-side with queue + 429 backoff.
- Fun questions: spaced (day 3, 10, 30...) single-tap polls ("do you own this look?" "more stripes or solids?") → feed preference vector.

## 4. Colab plan (the "Google Classroom" part — assuming Colab free T4; works on Pro too)

> **As-built status:** see `ml/README.md` for exact commands, sources, and metrics. Deviations from the original plan:
> - **MobileCLIP-S1**, not S0 — `open_clip` has no S0 checkpoint.
> - **ONNX Runtime, not TFLite** — `onnx2tf` and int8 dynamic quantization both broke parity on FastViT (cosine -0.12 / 0.11). fp32 ONNX parity is 1.000.
> - **Linear probes are the primary tagger** for slot (0.930) and formality (0.942); color probe is 0.642. Pattern/fit stay zero-shot until a train-split probe is built.
> - **ABO outfit data is not publicly downloadable** (ABO has product metadata, no outfits). Notebook 03 is a Polyvore FITB baseline; it produced a negative result (0.242 vs 0.250 random), confirming item-id CF does not transfer and attribute rules are required.
> - Colab CLI runs use ephemeral `/content/StyleMe` and SCP artifacts out; browser runs still mount Drive.

Repo folder `ml/`, all outputs → Google Drive (mount at start; VM disk is ephemeral).

### Notebook 00 — `00_setup_and_download.ipynb`
- Mount Drive. `pip install` list. Kaggle auth (user pastes kaggle.json once; stored in Drive).
- `scripts/download_data.py` — downloads, zips, stores on Drive:
  - **DeepFashion2** (Kaggle mirror; official site needs a form — script tries Kaggle first, falls back to official Drive link user pastes). 491k imgs / 13 classes / 801k items. Use: validation ground truth for vision tags. ~6–10 GB.
  - **ABO** (Kaggle). 28k outfits, item attributes + compatibility labels. Use: compatibility model. ~1 GB.
  - **Fashionpedia** (Kaggle CSV mirror, optional/phase-2). 48k imgs, 294 fine-grained attributes. Use: extend taxonomy, fine-tune attribute probe. ~8 GB.
- Script is idempotent: skips what's already on Drive.

### Notebook 01 — `01_taxonomy_and_zero_shot.ipynb` (main path)
- Build **attribute taxonomy** (`taxonomy.yaml` → JSON): 13 categories, 16 colors (with HSV anchors), 8 patterns, 5 fits, 5 formality, 4 seasons, 6 materials. Each attribute = one natural-language prompt ("a photo of a long-sleeve top", "a red garment", "a striped shirt", "an oversized hoodie", "a formal blazer"...).
- Load **MobileCLIP** (HF: `MobileCLIP/mobileclip_s0` / `s1`), encode all prompts → `prompt_embeddings.json` (this file ships in the app bundle; adding a new attribute later = re-run this notebook, no app retraining).
- Evaluate zero-shot on **DeepFashion2 validation** (bbox crops): per-attribute accuracy table, confusion pairs. Decision gate: category ≥ 90%, color ≥ 85% (colors mostly handled by classical CV anyway), pattern ≥ 80%, fit ≥ 75%, formality ≥ 75%.
- **Classical CV color** validated here too: HSV→LAB k-means on bbox crops vs DeepFashion2 ground truth colors (expected: very high; this is why color doesn't need ML).
- Output: `eval_report.md` + `artifacts/taxonomy.json` + `artifacts/prompt_embeddings.json`.

### Notebook 02 — `02_probe_finetune_and_export.ipynb` (only if 01's gate fails)
- Option A (cheap, first try): **linear probe** on frozen MobileCLIP image embeddings for weak attributes (fit, formality) — fits easily in T4, ~1 epoch per head, checkpoints to Drive every epoch.
- Option B: **LoRA on MobileCLIP image tower** on DeepFashion2 subset (≤50k crops) if probe insufficient.
- Export: reparameterize → ONNX → TFLite (fp16, int8 where lossless) + CoreML. Bundle target: image tower < 25 MB. Numerical parity check PyTorch vs TFLite (cosine > 0.999).
- Output: `artifacts/mobileclip_image_{s0|s1}.tflite`, `artifacts/probe_{attr}.tflite` (if any), `export_metrics.json`.
- Also: `scripts/export_corrections.py` — pulls user tag-corrections.jsonl from a shared location into future fine-tune sets (flywheel).

### Notebook 03 — `03_compatibility_abo.ipynb`
- Load ABO (Kaggle). Item attributes → one-hots; outfit → multiset of item vectors.
- Train: (a) binary compatibility classifier, (b) fill-in-the-blank ranker (softmax over candidate items). Baseline: attribute logistic regression → MLP upgrade. T4, minutes.
- Extract **interpretable weights** → `artifacts/compat_weights.json` (per rule: learned coefficient vs hand-encoded default; engine blends `0.5·hand + 0.5·learned` and exposes both).
- Report: Compat AUC, FITB top-1/top-5 vs published baselines (cite in repo).

### Colab survival rules (built into every notebook)
- Drive mounted first; all data/artifacts/checkpoints on Drive, never /content only.
- Resume cell at top: "continue from Drive state" — safe to re-run after disconnect.
- Each notebook < 10 h worst case; heavy loops batched with per-batch Drive writes.

## 5. App design (first principles of design)

Principles: one primary action per screen; everything reachable in ≤2 taps; setup < 3 min; no dark patterns; transparency (show why).

Design tokens (`packages/design`): 1 neutral base (warm grey/ink), 1 accent (user can pick later), 2 type sizes per screen max, 8-pt spacing grid, 16 px radius. Light-first, dark mode day one (cheap, expected).

Screens:
1. **Onboarding** (≤6 taps): name → city (weather) → wardrobe size guess → 5 vibe chips (minimal/street/classic/bold/cozy, multi-select) → "how's your laundry life" (1 slider) → done.
2. **Capture** (the 3-min setup): "photograph each item" → camera → auto-crop (MediaPipe selfie segmentation if person in frame, else full frame) → auto-tags appear as chips (category, 2–3 color swatches, pattern, fit) → user taps a wrong chip to fix (correction = training data + trust) → next. Progress ring. 30 items ≈ 3 min.
3. **Home / Today**: big "Today" card → weather line + occasion chips (tap to set) → **3 outfit cards** (item thumbnails stacked, color dots, one-line tone-voiced reason) → pick → confirm ("worn — starts laundry cooldown") or "not today" (all 3 logged as rejected → learning) → "why these?" expandable rule list.
4. **Wardrobe**: grid + filters (slot/color/status). Item sheet: photo, tags (editable), status toggle, "I washed it" button, wear history. Bulk "all washed" action.
5. **Style DNA**: learned profile bars (colors, fits, formality) + "never mix" personal rules list + reset.
6. **Later**: **Shop the gap** — wardrobe-gap suggestions from style vector (slots/colors/formality you never have) → text-only in MVP, affiliate/partner links later.

Onboarding flow, capture flow, and "why" panel are the three screens that decide the product. Build them first, polish them hardest.

## 6. Data model (D1)

```
users(id, locale, onboarding_json, tone_json, pref_vector_json, created_at)
garments(id, user_id, r2_key, category, attrs_json, embedding_b64,
         status, status_changed_at, added_at, corrections_json)
outfits(id, user_id, garment_ids_json, score, reasons_json, created_at)
wear_log(id, user_id, outfit_id, worn_at, occasion, mood, context_json)
suggestions(id, user_id, offered_outfits_json, picked_outfit_id, ts)
laundry_events(id, user_id, garment_ids_json, event, ts)   -- in_wash | washed
tone_cache(id, user_id, day, copy_json, ts)
```

Local mirror: Expo SQLite (same schema subset) → queue-based offline sync (writes happen offline, sync when online). Wardrobe works 100% offline; only "Today" refresh needs network (engine is server-side).

## 7. API surface

```
POST /v1/auth/dev          (MVP: device id + one-time code; real auth = Supabase-free
                            JWT on worker, or add Clerk free tier later)
POST /v1/wardrobe/sync     { items[], corrections[], deletions[] }
POST /v1/recommend         { occasion, mood, temp_c, laundry[] } → { outfits[≥3], reasons[] }
POST /v1/laundry           { garment_ids[], event: in_wash|washed }
POST /v1/learn             { suggested_ids[], picked_id, occasion, ts }
GET  /v1/tone?day=…        → user-specific copy (cached)
```

Auth MVP: device-scoped token (worker-issued JWT, stored in secure storage). Keep it boring.

## 8. Repo layout

```
styleme/
  apps/
    mobile/            # Expo RN (TS)
    worker/            # Cloudflare Workers (Hono, TS)
  packages/
    engine/            # recommendation engine (pure TS, 100% unit-tested)
    schema/            # zod types shared app↔worker↔ml exports
    design/            # tokens, theme, typography
  ml/
    00_setup_and_download.ipynb
    01_taxonomy_and_zero_shot.ipynb
    02_probe_finetune_and_export.ipynb
    03_compatibility_abo.ipynb
    scripts/           # download_data.py, export helpers
    artifacts/         # (git-ignored; pulled from Drive/HF)
  docs/                # PLAN.md, PRD, design-rationale
  turbo.json           # turborepo
```

CI: GitHub Actions → lint, engine unit tests, property test (uniqueness invariant), worker deploy on main (Cloudflare), mobile E2E smoke later.

## 9. Phases

| # | Deliverable | Exit criteria |
|---|---|---|
| 0 | Scaffolding: monorepo, CI, design tokens, schema package, worker hello-world deployed | `npx turbo run test` green on CI; worker live at *.workers.dev |
| 1 | ML pipeline v1: notebooks 00+01 run on free Colab, data on Drive, taxonomy + zero-shot eval report, artifacts exported | DeepFashion2 val: category ≥90%, pattern ≥80%, fit/formality ≥75%; TFLite parity cos > 0.999 |
| 2 | App: onboarding + capture + wardrobe CRUD, on-device MobileCLIP tagging, local SQLite, offline | 30-item wardrobe ingested < 4 min on mid-range Android; tags correct ≥80% without correction (self-scored) |
| 3 | Engine v1 + worker: full rule set 3.2 (hand-encoded), /recommend returns ≥3 outfits + reasons, weather, laundry filter | Engine test suite green; 1000-outfit simulation: 0 rule violations (laundry, completeness, >3 non-neutral colors) |
| 4 | Learning loop: pick events → preference EWA, novelty term, "why" panel, wear log, rotation | A/B harness: after 20 pick-events, repeat-offer rate of exact same top-1 drops >40% |
| 5 | ABO model: notebook 03, compat weights blend into engine | Compat AUC ≥ baseline (0.75+); engine with blend wins head-to-head vs rules-only on ABO FITB top-5 |
| 6 | Tone engine: vocab detector + word bank + Gemini Flash cached rewrites | Tone profile from 3 free-text inputs; RPD-safe queue; copy cache hit rate >90% |
| 7 | Shop-the-gap: gap analysis → suggestions screen (text-only) | Suggestion quality reviewed by 2 humans vs wardrobe, ≥70% "yes I'd buy this" |
| 8 | Beta: TestFlight internal + Play internal testing, crash-free ≥99.5%, onboarding funnel measured | 5 beta users, 2-week retention, NPS |

Sequence: 0 → (1 ∥ 2) → 3 → 4 → (5 ∥ 6) → 7 → 8. Phase 1 and 2 are independent — run parallel.

## 10. Free-tier budget & limits (verified 2026-11)

| Service | Free limit | Our usage | Headroom |
|---|---|---|---|
| Cloudflare Workers | 100k req/day, 10 ms CPU (free) | < 1 req/user/day for MVP engine (pure math, <5 ms) | huge |
| D1 | 5 GB, 10M row reads/day | KB-scale rows | huge |
| R2 | 10 GB, no egress fees | 30 photos/user × ~500 KB = 15 MB/user | ~650 users |
| Open-Meteo | 10k calls/day, no key | 1/user/day cached | huge |
| Gemini Flash (free) | unpublished RPD (AI Studio), data may be used | opt-in only, 1 call/user/24h cached | fine |
| Colab free | T4 16 GB, ≤12 h/session, ephemeral disk | one notebook run/week | fine (Drive-persistent) |
| Expo EAS (free) | 30 build min/month | weekly builds | fine |

Privacy note: user photos do NOT go to Gemini by default. If opt-in "deep tagging" is used, we downscale to 512 px, strip EXIF, and label the toggle clearly.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| MobileCLIP zero-shot fit/formality below gate | Notebook 02 probe/LoRA path; formality can fall back to 3-level (casual/smart/formal) which is easier and arguably the right granularity |
| Free Colab session dies mid-run | Checkpoint-to-Drive every epoch; resume cell; each notebook < 10 h |
| DeepFashion2 download friction (official form) | Kaggle mirror via kaggle.json; script falls back to manual link paste; 30-min human step max |
| Gemini free RPD too low for tone | Word-bank is default; Gemini only for special moments, 1/user/day, 429 backoff + queue |
| Low-end Android TFLite speed | S0 (11.4M params) runs in ~1.5 ms on modern SoC; inference batched async during capture, never on tap |
| R2 10 GB ceiling at scale | Photos stay on device by default; R2 is optional backup; raise plan or add Supabase Storage (1 GB free) when it matters — architecture doesn't change |
| Engine over-optimizes → user bored | Exploration term + novelty penalty are hard-coded invariants, not tunables; CI property test enforces diversity |
| "Why" explanations feel robotic | Reasons map to plain language via tone engine; show max 3 reasons |

## 12. Explicit non-goals (MVP)

- No trend data feeds. Ever, in the core engine.
- No social features, no sharing, no feed.
- No AR try-on, no outfit photo rendering — thumbnails from the user's own photos only.
- No real e-commerce checkout (gap suggestions are text; monetization is a later conversation).
- No iOS/Android native code — pure Expo + packages.

## 13. Open decisions (need your pick)

1. **App framework** — recommendation: **Expo/RN (TypeScript)**. Alternative: Flutter (Dart; better pixel-identical control, smaller ecosystem, slower OTA).
2. **Vision** — recommendation: **on-device MobileCLIP first**, Gemini enrichment opt-in later. Alternative: Gemini-first (faster to build, but rate-limited, paid-ish at scale, privacy).
3. **Backend** — recommendation: **Cloudflare (Workers+D1+R2)**. Alternative: Vercel + Supabase (nicer DX, but Supabase 500 MB DB ceiling).
4. **ABO compatibility model** — include in v1 (phase 5) or launch rules-only and add later? Recommendation: build engine rules-only (phase 3–4), ABO as phase 5 (it's parallel work, doesn't block MVP).
5. **Colab assumption** — I'm assuming "Google Classroom subscription" = Google **Colab** (free T4 or Colab Pro). Confirm; if it's actually a classroom/education plan for something else, the notebook plan still works, runtime access is the only variable.
