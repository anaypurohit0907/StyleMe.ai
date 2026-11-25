/**
 * StyleMe design tokens — first principles of design.
 *
 * Rules this system enforces:
 *  - ONE accent color. Neutrals do the rest.
 *  - Two type sizes per screen, max (display + body).
 *  - 8pt spacing grid, no exceptions.
 *  - 16px radius, one corner language.
 *  - No gradients, no shadows on text, no decorative chrome.
 *  - Every screen: one primary action.
 */

export const colors = {
  // neutrals (light)
  bg: "#FAF9F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F1EFEA",
  ink: "#141414",
  inkSoft: "#5C5952",
  inkFaint: "#9B968C",
  line: "#E5E1D8",

  // neutrals (dark)
  bgDark: "#111110",
  surfaceDark: "#1C1C1A",
  surfaceAltDark: "#262624",
  inkDark: "#F2F0EB",
  inkSoftDark: "#A8A49B",
  inkFaintDark: "#6E6A61",
  lineDark: "#2E2E2B",

  // the single accent (user-pickable later; default: a calm rust)
  accent: "#B4552D",
  accentSoft: "#F3E2D7",

  // status
  ok: "#3E7C4F",
  warn: "#B07C1F",
  bad: "#A83A32",
} as const;

/**
 * Semantic themes — same token names over light/dark palettes.
 * Screens consume these via a scheme-aware hook (apps/mobile/src/lib/theme.ts);
 * the flat `colors` export stays for static, non-scheme surfaces (swatches etc.).
 */
export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  overlayStrong: string;
  overlaySoft: string;
  /** Translucent chrome tint for glass bars (dark uses ink-based tint). */
  chrome: string;
  chromeBorder: string;
  /** Whether this scheme is dark (used by the glass chrome / motion fallbacks). */
  isDark: boolean;
  accent: string;
  accentSoft: string;
  /** Text/icon color on accent- and bad-filled surfaces — white in both themes. */
  onAccent: string;
  /** Primary action fill: rust in light, restrained ink in dark. */
  actionBg: string;
  /** Text/icon on the primary action fill. */
  onAction: string;
  ok: string;
  warn: string;
  bad: string;
};

export const themes: Record<"light" | "dark", ThemeColors> = {
  light: {
    bg: "#FAF9F7",
    surface: "#FFFFFF",
    surfaceAlt: "#F1EFEA",
    ink: "#141414",
    inkSoft: "#5C5952",
    inkFaint: "#9B968C",
    line: "#E5E1D8",
    overlayStrong: "rgba(250,249,247,0.97)",
    overlaySoft: "rgba(250,249,247,0.92)",
    chrome: "rgba(255,255,255,0.78)",
    chromeBorder: "rgba(229,225,216,0.76)",
    isDark: false,
    accent: "#B4552D",
    accentSoft: "#F3E2D7",
    onAccent: "#FFFFFF",
    actionBg: "#B4552D",
    onAction: "#FFFFFF",
    ok: "#3E7C4F",
    warn: "#B07C1F",
    bad: "#A83A32",
  },
  dark: {
    bg: "#111110",
    surface: "#1C1C1A",
    surfaceAlt: "#262624",
    ink: "#F2F0EB",
    inkSoft: "#A8A49B",
    inkFaint: "#6E6A61",
    line: "#2E2E2B",
    overlayStrong: "rgba(17,17,16,0.97)",
    overlaySoft: "rgba(17,17,16,0.92)",
    chrome: "rgba(28,28,26,0.72)",
    chromeBorder: "rgba(46,46,43,0.72)",
    isDark: true,
    accent: "#B4552D",
    accentSoft: "#F3E2D7",
    onAccent: "#FFFFFF",
    actionBg: "#262624",
    onAction: "#F2F0EB",
    ok: "#3E7C4F",
    warn: "#B07C1F",
    bad: "#A83A32",
  },
};

/** Light is the default; null/undefined schemes (web, pre-hydration) fall back safely. */
export function getTheme(scheme: "light" | "dark" | null | undefined): ThemeColors {
  return scheme === "dark" ? themes.dark : themes.light;
}

export const paletteSwatch: Record<string, string> = {
  black: "#181818",
  white: "#FAFAF8",
  cream: "#F0E6CD",
  grey: "#808082",
  navy: "#1C2644",
  tan: "#CDAF7D",
  brown: "#5F3E26",
  red: "#C82626",
  orange: "#EB821E",
  yellow: "#F0D23C",
  green: "#328246",
  teal: "#237882",
  blue: "#2D5FB4",
  purple: "#734696",
  pink: "#EB96B4",
  rust: "#AA502D",
};

export const space = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const type = {
  display: {
    fontFamily: "DMSerifDisplay",
    fontSize: 30,
    fontWeight: "400" as const,
    lineHeight: 36,
  },
  title: { fontSize: 20, fontWeight: "600" as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: "500" as const, lineHeight: 18 },
} as const;

/** Occasion chips shown on the Today screen. */
export const occasions = [
  "office",
  "date",
  "beach",
  "party",
  "errands",
  "gym",
  "casual",
] as const;

export const occasionLabel: Record<string, string> = {
  office: "Office",
  date: "Date",
  beach: "Beach",
  party: "Party",
  errands: "Errands",
  gym: "Gym",
  casual: "Casual",
};
