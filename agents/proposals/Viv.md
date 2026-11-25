# Viv — product review

## 1. What this app is (one sentence) / who it is for

A private, on-device stylist for people who already own clothes but freeze at
“what do I wear today”; it should feel like a warm fashion editor, not a
wardrobe database.

## 2. Three biggest product problems (evidence)

1. **First impression does not match the brand’s promise.** The launcher,
   DM Serif display face, cream/rust palette, and symbol tabs now look
   editorial — but the main surface still reads as a wireframe. In the 13:24
   build (`/home/anay/t062-dark.png`, `/tmp/opencode/device-wardrobe-fixed.png`)
   13 of 14 wardrobe tiles are flat color blocks, and Today’s hero cards are
   mostly empty swatches instead of clothes. A user sees “unfinished data”
   before they see a look. The photo pipeline exists; the product needs a
   deliberate visual fallback (styled garment silhouettes / “photo missing”
   treatment / a first-run capture prompt), not raw swatches.
2. **The core action is visually louder than the outfit.** The large filled
   “Wear this” bar and the rust “Add” button dominate every card; the outfit
   itself gets a row of equal-width thumbnails. This is backwards for a
   lookbook product. The app’s differentiator is taste, but the UI hierarchy
   still says “form submission.” The dark-mode rework moves the primary to a
   restrained surface fill — good direction; the layout still needs the same
   restraint.
3. **Chrome is being treated as the product.** The last day of work went into
   frosted glass, tab insets, and nav-bar pixels — important polish, but it
   blocked the release and produced a crash. A user does not download this app
   for the tab bar; they download it to get dressed. If Android blur cannot be
   made reliable quickly, ship a quiet translucent warm chrome and move the
   attention back to outfit presentation and capture quality.

## 3. Pivot options (2–3) — what changes, effort, risk

1. **Lookbook-first Today (recommended).** One outfit at a time, photo-led:
   a large editorial card, garment names in human language, “why” as a short
   disclosure, and a single decisive action. Swipe/peek the other two instead
   of three stacked form cards. Effort: medium (layout + components, no new
   model); risk: real photos must be present and consistent, so it depends on
   the capture/first-run fix. This is the highest-leverage visual pivot.
2. **Brand the empty state, not just the chrome.** Give missing photos a
   designed fallback: flat-lay silhouette tiles in the palette, a “photograph
   this piece” prompt, or a single editorial onboarding image. Effort: low
   (assets + one component); risk: taste, must not become decorative noise.
   It makes the current data state feel intentional while capture improves.
3. **Stage the glass.** Keep the restrained dark action tokens and symbol
   tabs; treat true frosted glass as an optional iOS/augmented enhancement
   behind a capability check, and use a transparent warm tint on Android until
   a real blur target is proven. Effort: low; risk: user explicitly asked for
   glass, so label it honestly as “tint now, blur when reliable” rather than
   claiming a glass pass that screenshots cannot show.

## 4. Keep / kill / defer

- **Keep:** DM Serif display + warm cream/rust identity; symbol tabs; the
  single-accent discipline; the private/on-device story.
- **Kill:** large rust primary fills in dark mode; equal-weight thumbnail rows
  as the hero of Today; raw enum/score/debug copy on user surfaces.
- **Defer:** Android Liquid-Glass parity and elaborate chrome until the core
  lookbook surface is photo-led and the release is unblocked.

## 5. One thing to test with a real user next

Show five people a single Today screenshot for ten seconds, then ask: “What
does this app do, and what would you tap first?” Also ask whether the empty
color blocks make the wardrobe feel unfinished. If they answer “wardrobe
inventory” instead of “outfit ideas,” the visual hierarchy is still wrong —
regardless of how good the glass looks.
