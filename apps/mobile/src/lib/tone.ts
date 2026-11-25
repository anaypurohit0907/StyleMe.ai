/**
 * Mobile tone profile — the bridge between onboarding words and UI copy.
 *
 * The profile lives in `meta.toneProfile`; screens read it through
 * `useToneProfile()` and render canonical keys through `voice()`. The engine
 * stays pure/offline; this file only persists and exposes it.
 */
import { useEffect, useState } from "react";
import { detectTone, toneText } from "@styleme/engine";
import { ToneProfileSchema, type ToneProfile } from "@styleme/schema";
import { metaGet, metaSet } from "@/lib/db";

const TONE_KEY = "toneProfile";

/** No detected voice — every surface renders classic copy. */
export const NEUTRAL_TONE: ToneProfile = { bank: "none", intensity: 0 };

export async function loadToneProfile(): Promise<ToneProfile> {
  const raw = await metaGet(TONE_KEY);
  if (!raw) return NEUTRAL_TONE;
  try {
    const parsed = ToneProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : NEUTRAL_TONE;
  } catch {
    return NEUTRAL_TONE;
  }
}

export async function saveToneProfile(profile: ToneProfile): Promise<void> {
  await metaSet(TONE_KEY, JSON.stringify(profile));
}

/** Detect from free text, persist, and return the profile. */
export async function detectAndSaveTone(texts: string[]): Promise<ToneProfile> {
  const profile = detectTone(texts.filter((t) => t.trim().length > 0));
  await saveToneProfile(profile);
  return profile;
}

/**
 * Render a canonical key in the user's voice. Pass a stable `seedKey`
 * (item id, outfit signature) so a surface does not flip between flavored
 * and classic copy on every render.
 */
export function voice(key: string, profile: ToneProfile, seedKey?: string): string {
  return toneText(key, profile, seedKey);
}

/** Load once per mount; onboarding writes the profile before navigation. */
export function useToneProfile(): ToneProfile {
  const [profile, setProfile] = useState<ToneProfile>(NEUTRAL_TONE);
  useEffect(() => {
    let alive = true;
    loadToneProfile()
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {
        // No voice is a valid state.
      });
    return () => {
      alive = false;
    };
  }, []);
  return profile;
}
