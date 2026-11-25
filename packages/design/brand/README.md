# StyleMe brand mark

The launcher icon: a single rust **S** folded from one ribbon, on warm cream.
Flat, two colors, no text — it has to read at 48 px and match the app's
"one accent, warm neutrals" design language.

| File | Purpose |
|---|---|
| `mark.svg` | Editable vector master (rust `#B4552D` on transparent) |
| `icon-master.png` | 1024 opaque light icon, exactly as shipped |
| `icon-dark.png` | 1024 dark-mode variant (cream on `#111110`), not wired yet |
| `icon-source.jpg` | Generated source frame, kept for provenance |

Palette comes from `packages/design/src/tokens.ts`:

- background `#FAF9F7` (`colors.bg`)
- mark `#B4552D` (`colors.accent`)
- dark variant `#F2F0EB` on `#111110` (`colors.inkDark` / `colors.bgDark`)

## Shipped derivatives

`apps/mobile/assets/images/`: `icon.png` (root/iOS, 1024 opaque),
`splash-icon.png` (transparent cream mark on the `#111110` splash),
`android-icon-foreground.png` (rust, inside the 66% adaptive safe zone),
`android-icon-monochrome.png` (white silhouette for themed icons),
`favicon.png` (64 px web).

## Regenerate

`mark.svg` is the source of truth; do not hand-edit the shipped PNGs. Potrace
was used once to turn the generated source frame into `mark.svg`
(`potrace -i mark.pbm -s --alphamax 1.2 --opttolerance 0.3 --turdsize 20`),
then the PNGs were rendered from it with ImageMagick/Pillow at 2048 and
downsampled. Keep the mark inside the centre 66% for adaptive icons and keep
the iOS icon opaque (no alpha, no pre-rounded corners).
