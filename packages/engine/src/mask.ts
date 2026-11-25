/**
 * Salient-mask cleanup for flat-lay photos.
 *
 * U²-Net-p sometimes keeps a high-contrast bedspread corner or pillow as part
 * of the salient object. That produces portrait-shaped masks and cutouts that
 * include the background. This helper keeps the central connected garment
 * component, allows detached garment parts near it, and drops far/border blobs.
 *
 * Pure typed-array code so the same function runs on-device and in vitest.
 */

export interface MaskCleanupResult {
  /** Cleaned mask; rejected pixels are zero, accepted pixels keep their value. */
  mask: Float32Array;
  /** Sum of accepted component areas, in source pixels. */
  keptArea: number;
  /** Accepted components (primary + detached parts). */
  keptComponents: number;
  /** Largest-component area before cleanup, in source pixels. */
  primaryArea: number;
}

interface Component {
  label: number;
  area: number;
  sumX: number;
  sumY: number;
  touchesBorder: boolean;
}

/**
 * Keep the connected component most likely to be the centered garment.
 *
 * @param mask   row-major float mask, values expected in [0, 1]
 * @param width  mask width (320 for U²-Net-p)
 * @param height mask height (320)
 * @param threshold foreground threshold (0.5 default)
 */
export function cleanMask(
  mask: Float32Array,
  width: number,
  height: number,
  threshold = 0.5,
): MaskCleanupResult {
  const total = width * height;
  if (total <= 0 || mask.length < total) {
    return { mask, keptArea: 0, keptComponents: 0, primaryArea: 0 };
  }

  const labels = new Int32Array(total);
  const components: Component[] = [];
  const queue = new Int32Array(total);

  let tail = 0;
  for (let start = 0; start < total; start++) {
    if ((mask[start] ?? 0) < threshold || labels[start] !== 0) continue;
    const label = components.length + 1;
    const comp: Component = { label, area: 0, sumX: 0, sumY: 0, touchesBorder: false };
    let head = 0;
    tail = 0;
    labels[start] = -1;
    queue[tail++] = start;
    while (head < tail) {
      const index = queue[head++] ?? 0;
      const x = index % width;
      const y = (index / width) | 0;
      comp.area++;
      comp.sumX += x;
      comp.sumY += y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) comp.touchesBorder = true;
      if (x > 0) {
        const n = index - 1;
        if (labels[n] === 0 && (mask[n] ?? 0) >= threshold) {
          labels[n] = -1;
          queue[tail++] = n;
        }
      }
      if (x + 1 < width) {
        const n = index + 1;
        if (labels[n] === 0 && (mask[n] ?? 0) >= threshold) {
          labels[n] = -1;
          queue[tail++] = n;
        }
      }
      if (y > 0) {
        const n = index - width;
        if (labels[n] === 0 && (mask[n] ?? 0) >= threshold) {
          labels[n] = -1;
          queue[tail++] = n;
        }
      }
      if (y + 1 < height) {
        const n = index + width;
        if (labels[n] === 0 && (mask[n] ?? 0) >= threshold) {
          labels[n] = -1;
          queue[tail++] = n;
        }
      }
    }
    // Mark every pixel in this component with its real label.
    for (let i = 0; i < tail; i++) {
      const index = queue[i] ?? 0;
      labels[index] = label;
    }
    components.push(comp);
  }

  if (components.length === 0) {
    return { mask, keptArea: 0, keptComponents: 0, primaryArea: 0 };
  }

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) / 2;
  let primary: Component | null = null;
  let bestScore = -Infinity;
  for (const comp of components) {
    const x = comp.sumX / comp.area;
    const y = comp.sumY / comp.area;
    const dist = Math.hypot((x - cx) / radius, (y - cy) / radius);
    const centerPrior = Math.exp(-2.4 * dist * dist);
    const borderPenalty = comp.touchesBorder ? 0.62 : 1;
    const score = comp.area * (0.5 + 0.5 * centerPrior) * borderPenalty;
    if (score > bestScore) {
      bestScore = score;
      primary = comp;
    }
  }
  if (!primary) {
    return { mask, keptArea: 0, keptComponents: 0, primaryArea: 0 };
  }

  // Don't wipe a mask that is already tiny or essentially the whole frame.
  if (primary.area < total * 0.004 || primary.area > total * 0.97) {
    return { mask, keptArea: primary.area, keptComponents: 1, primaryArea: primary.area };
  }

  const px = primary.sumX / primary.area;
  const py = primary.sumY / primary.area;
  const keep = new Set<number>([primary.label]);
  for (const comp of components) {
    if (comp === primary) continue;
    const x = comp.sumX / comp.area;
    const y = comp.sumY / comp.area;
    const near = Math.hypot(x - px, y - py) <= Math.max(width, height) * 0.35;
    if (!comp.touchesBorder && near && comp.area >= primary.area * 0.1) {
      keep.add(comp.label);
    }
  }

  const out = new Float32Array(total);
  let keptArea = 0;
  for (let i = 0; i < total; i++) {
    if (keep.has(labels[i] ?? 0)) {
      out[i] = mask[i] ?? 0;
      keptArea++;
    }
  }
  return { mask: out, keptArea, keptComponents: keep.size, primaryArea: primary.area };
}
