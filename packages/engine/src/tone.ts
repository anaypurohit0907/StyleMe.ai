/**
 * Tone engine — the app talks like the user.
 *
 * Layer 1 (default, instant, offline): word-bank substitution over
 * canonical UI strings. Every screen emits canonical keys; the tone
 * engine swaps them per the user's detected slang bank.
 * Layer 2 (optional, server-side): Gemini Flash rewrites special-moment
 * copy, cached per user per day. Lives in the worker, not here.
 */
import type { ToneProfile } from "@styleme/schema";
import { mulberry32, hashSeed } from "./explore";

/**
 * Canonical keys → flavored text per bank.
 * Keep keys in sync with the app's copy list (docs/TONE_KEYS.md).
 *
 * Copy rules (T-007 audit §2): every bank covers every key; no phrase is
 * recycled across keys; "honestly" is a millennial marker, not genz; genz
 * keeps "twin" / "clock it" in rotation; weather copy differs per bank.
 */
const BANKS: Record<string, Record<string, string>> = {
  genz: {
    pick_one: "pick one, twin",
    not_today: "not today — no cap",
    today_outfit: "today's fit, served",
    why_these: "clock it — here's why",
    in_laundry: "it's in the wash, fr",
    washed_back: "back from the wash, fresh",
    wardrobe_ready: "wardrobe locked in",
    wardrobe_empty: "empty rack — let's cook",
    new_item_added: "new piece, added",
    save_confirmation: "saved — it's in the rotation",
    gap_suggestion: "your wardrobe needs this",
    streak: "you're on a streak, iconic",
    first_outfit: "first fit logged — it's only up from here",
    poll_invite: "quick taste check, twin",
    weather_line: "clock the weather",
    greeting_morning: "morning",
    greeting_afternoon: "afternoon",
    greeting_evening: "evening",
    fresh_rotation: "fresh rotation, nothing worn this week",
  },
  millennial: {
    pick_one: "pick your vibe",
    not_today: "not today, honestly",
    today_outfit: "today's look",
    why_these: "the thinking behind it",
    in_laundry: "it's in the laundry",
    washed_back: "fresh from the laundry",
    wardrobe_ready: "wardrobe's set",
    wardrobe_empty: "your wardrobe's waiting",
    new_item_added: "added to your rotation",
    save_confirmation: "saved to your rotation",
    gap_suggestion: "your wardrobe could use this",
    streak: "consistency streak — lowkey impressive",
    first_outfit: "first outfit's in the books",
    poll_invite: "one quick thing",
    weather_line: "quick weather check",
    greeting_morning: "morning",
    greeting_afternoon: "afternoon",
    greeting_evening: "evening",
    fresh_rotation: "fresh rotation, nothing repeated this week",
  },
  classic: {
    pick_one: "choose today's outfit",
    not_today: "none of these today",
    today_outfit: "today's outfit",
    why_these: "why we picked these",
    in_laundry: "currently in the laundry",
    washed_back: "returned from the laundry",
    wardrobe_ready: "your wardrobe is ready",
    wardrobe_empty: "nothing here yet",
    new_item_added: "added to your wardrobe",
    save_confirmation: "saved to your wardrobe",
    gap_suggestion: "a gap your wardrobe could fill",
    streak: "consistency streak",
    first_outfit: "your first outfit is logged",
    poll_invite: "one quick question",
    weather_line: "weather",
    greeting_morning: "morning",
    greeting_afternoon: "afternoon",
    greeting_evening: "evening",
    fresh_rotation: "nothing repeated this week",
  },
};

const SLANG_HITS: Record<string, string[]> = {
  genz: [
    "twin", "no cap", "slay", "rizz", "bet", "lowkey", "it's giving", "it is giving",
    "dead", "ate", "icon", "era", "bestie", "periodt", "cook", "locked in",
    "clock it", "sus", "ngl", "tbh", "litrally", "main character", "ohio",
    "fr fr", "bruh", "vibes", "sheesh", "no shot", "understood the assignment",
  ],
  millennial: [
    "vibe check", "lowkey", "highkey", "honestly", "literally", "no thanks",
    "basic", "aesthetic", "main character", "blessed", "queen", "king",
    "slay", "game on", "obsessed", "perfect", "vibe", "mood",
  ],
  classic: ["formal", "tailored", "classic", "timeless", "polished"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect the user's tone profile from free-text they've typed
 * (onboarding answers, nicknames, corrections).
 * Pure frequency counting — no LLM. Hits match whole words/phrases so
 * "bet" does not fire on "better" and "era" does not fire on "general".
 */
export function detectTone(texts: string[]): ToneProfile {
  const joined = texts.join(" ").toLowerCase();
  const scores: Record<string, number> = {};
  for (const [bank, hits] of Object.entries(SLANG_HITS)) {
    let s = 0;
    for (const h of hits) {
      const re = new RegExp(`\\b${escapeRegExp(h)}\\b`);
      if (re.test(joined)) s++;
    }
    scores[bank] = s;
  }
  let best = "none";
  let bestScore = 0;
  for (const [bank, s] of Object.entries(scores)) {
    if (s > bestScore) {
      best = bank;
      bestScore = s;
    }
  }
  const bank = bestScore >= 2 ? best : "none";
  const intensity = bestScore >= 2 ? Math.min(1, bestScore / 6) : 0;
  return { bank: bank as ToneProfile["bank"], intensity: Number(intensity.toFixed(2)) };
}

/**
 * Translate a canonical key into the user's voice.
 * With probability `intensity` the flavored string is used; otherwise the
 * classic bank (keeps the app from sounding on-the-nose).
 */
export function toneText(
  key: string,
  profile: ToneProfile,
  seedKey: string = "stable",
): string {
  const fallback = BANKS.classic?.[key] ?? key;
  if (profile.bank === "none" || profile.intensity <= 0) return fallback;
  const bank = BANKS[profile.bank];
  const flavored = bank?.[key];
  if (!flavored) return fallback;
  const rng = mulberry32(hashSeed(`${seedKey}:${key}:${profile.bank}`));
  return rng() < profile.intensity ? flavored : fallback;
}

export { BANKS };
