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
  display: { fontSize: 30, fontWeight: "700" as const, lineHeight: 36 },
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
