/**
 * Local-first StyleMe brain.
 *
 * The same `@styleme/engine` that runs in the worker runs here, so the app
 * still gives 3 outfits with no network. The worker is used for fresh weather,
 * cross-device sync, and tone copy when available.
 */
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import type {
  ColorName,
  Garment,
  GarmentAttrs,
  Occasion,
  PreferenceVector,
  RecommendContext,
  ScoredOutfit,
} from "@styleme/schema";
import { emptyPreference } from "@styleme/schema";
import {
  recommend,
  updateExploreState,
  updatePreference,
  outfitSignature,
  type SignatureState,
} from "@styleme/engine";
import { getDb, metaGet, metaSet } from "./db";
import { clearAuthCache, deleteAuthItem } from "./api";

function newDeviceId(): string {
  return `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await metaGet("deviceId");
  if (existing) return existing;
  const id = newDeviceId();
  await metaSet("deviceId", id);
  return id;
}

/**
 * Recovery for a lost/invalid worker registration secret (auth 403): rotate to
 * a fresh device id and clear the cached token + secret so the next
 * `ensureAuth` registers as a new worker user. Local wardrobe, onboarding and
 * learned preferences stay intact — the old worker-side identity is abandoned
 * because there is no proof left to reclaim it. Callers can retry the failed
 * request immediately; no re-onboarding is required by this helper.
 */
export async function resetDeviceIdentity(): Promise<string> {
  const id = newDeviceId();
  clearAuthCache();
  await deleteAuthItem("token");
  await deleteAuthItem("registrationSecret");
  await metaSet("deviceId", id);
  return id;
}

export async function loadPrefs(): Promise<PreferenceVector> {
  const raw = await metaGet("prefs");
  if (!raw) return emptyPreference();
  try {
    return { ...emptyPreference(), ...JSON.parse(raw) } as PreferenceVector;
  } catch {
    return emptyPreference();
  }
}

/**
 * Capture session target from the onboarding wardrobe-size guess (T-030).
 * Clamped 10–60 so a stale or odd value can't make the progress bar
 * meaningless; 30 is the fallback when the guess was never stored.
 */
export async function sessionTarget(): Promise<number> {
  const raw = await metaGet("wardrobeSizeGuess");
  const n = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(n)) return 30;
  return Math.max(10, Math.min(60, Math.round(n)));
}

/** Alias used by the capture screen — same value, friendlier name there. */
export const loadSessionTarget = sessionTarget;

export async function savePrefs(p: PreferenceVector): Promise<void> {
  await metaSet("prefs", JSON.stringify(p));
}

// --- retention signals (streak / first outfit / spaced polls) ----------------

const DAY_MS = 86_400_000;
const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30];

/** Local calendar day ordinal — DST-safe because only Y/M/D are compared. */
function dayOrdinal(ms: number): number {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

function clampPref(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export interface WearStreak {
  /** Consecutive days ending today (or yesterday, before today's pick). */
  days: number;
}

/** Consecutive local calendar days with at least one logged wear. */
export async function getWearStreak(now = Date.now()): Promise<WearStreak> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ worn_at: number }>("SELECT worn_at FROM wear_log");
  const days = new Set<number>();
  for (const row of rows) {
    if (Number.isFinite(row.worn_at)) days.add(dayOrdinal(row.worn_at));
  }
  const today = dayOrdinal(now);
  let cursor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  if (cursor === null) return { days: 0 };
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor -= 1;
  }
  return { days: count };
}

export async function getWearCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM wear_log");
  return row?.n ?? 0;
}

export function isStreakMilestone(days: number): boolean {
  return STREAK_MILESTONES.includes(days);
}

/** True once per streak milestone per local day; drives the celebration card. */
export async function claimStreakCelebration(days: number, now = Date.now()): Promise<boolean> {
  if (!isStreakMilestone(days)) return false;
  const today = dayOrdinal(now);
  const raw = await metaGet("streakCelebration");
  try {
    const prev = JSON.parse(raw ?? "null") as { day?: number; days?: number } | null;
    if (prev?.day === today && prev.days === days) return false;
  } catch {
    // Corrupt marker: celebrate once and reset it.
  }
  try {
    await metaSet("streakCelebration", JSON.stringify({ day: today, days }));
    return true;
  } catch {
    return false;
  }
}

export type PollTable = "colors" | "patterns" | "fits";
export interface PollOption {
  key: string;
  label: string;
}
export interface Poll {
  day: number;
  table: PollTable;
  question: string;
  options: PollOption[];
}

const POLLS: readonly Poll[] = [
  {
    day: 3,
    table: "patterns",
    question: "More stripes or solids?",
    options: [
      { key: "striped", label: "Stripes" },
      { key: "solid", label: "Solids" },
    ],
  },
  {
    day: 10,
    table: "fits",
    question: "Relaxed or tailored?",
    options: [
      { key: "relaxed", label: "Relaxed" },
      { key: "slim", label: "Tailored" },
    ],
  },
  {
    day: 30,
    table: "colors",
    question: "Rust or navy?",
    options: [
      { key: "rust", label: "Rust" },
      { key: "navy", label: "Navy" },
    ],
  },
];

async function loadPollDays(): Promise<number[]> {
  const raw = await metaGet("pollsShown");
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

async function wardrobeAgeDays(now: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ first: number | null }>(
    "SELECT MIN(added_at) AS first FROM garments",
  );
  if (typeof row?.first !== "number") return 0;
  return Math.max(0, dayOrdinal(now) - dayOrdinal(row.first));
}

/** The latest spaced poll the user has unlocked but not answered yet. */
export async function getPendingPoll(now = Date.now()): Promise<Poll | null> {
  const age = await wardrobeAgeDays(now);
  if (age < 3) return null;
  const shown = await loadPollDays();
  const pending = POLLS.filter((poll) => age >= poll.day && !shown.includes(poll.day)).sort(
    (a, b) => b.day - a.day,
  )[0];
  return pending ? { ...pending, options: [...pending.options] } : null;
}

/**
 * Apply a one-tap poll answer as an explicit taste signal. This is stronger
 * than a passive pick (0.25 vs the EWA's 0.15 step) and never counts as a
 * pick, so `n` confidence stays honest. Returns the updated vector.
 */
export async function answerPoll(poll: Poll, choice: string): Promise<PreferenceVector> {
  if (!poll.options.some((o) => o.key === choice)) {
    throw new Error(`unknown poll choice: ${choice}`);
  }
  const prefs = await loadPrefs();
  const next: PreferenceVector = {
    ...prefs,
    colors: { ...prefs.colors },
    patterns: { ...prefs.patterns },
    fits: { ...prefs.fits },
    neverMix: [...prefs.neverMix],
  };
  const bump = (table: Record<string, number>, key: string, delta: number) => {
    table[key] = clampPref((table[key] ?? 0) + delta);
  };
  const other = poll.options.find((o) => o.key !== choice);
  if (poll.table === "colors") {
    bump(next.colors, choice, 0.25);
    if (other) bump(next.colors, other.key, -0.1);
  } else if (poll.table === "patterns") {
    bump(next.patterns, choice, 0.25);
    if (other) bump(next.patterns, other.key, -0.1);
  } else {
    bump(next.fits, choice, 0.25);
    if (other) bump(next.fits, other.key, -0.1);
  }
  await savePrefs(next);
  // Answering the newest poll retires every earlier milestone too.
  const shown = await loadPollDays();
  const retired = POLLS.filter((p) => p.day <= poll.day).map((p) => p.day);
  await metaSet("pollsShown", JSON.stringify([...new Set([...shown, ...retired])]));
  return next;
}

export async function loadExplore(): Promise<Record<string, SignatureState>> {
  const raw = await metaGet("explore");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, SignatureState>;
  } catch {
    return {};
  }
}

export async function saveExplore(s: Record<string, SignatureState>): Promise<void> {
  await metaSet("explore", JSON.stringify(s));
}

export interface Weather {
  tempC: number;
  isRaining: boolean;
  city?: string;
  /** "fallback" = the 18°C offline guess, not a live reading. */
  source?: "live" | "fallback";
}

/** Open-Meteo, no API key. Falls back to a mild default offline. */
export async function getWeather(): Promise<Weather> {
  try {
    // Never block the Today screen on a permission prompt.
    const perm = await Promise.race([
      Location.requestForegroundPermissionsAsync(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (!perm) return { tempC: 18, isRaining: false, source: "fallback" };
    if (perm.status !== "granted") return { tempC: 18, isRaining: false, source: "fallback" };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}` +
      `&longitude=${pos.coords.longitude}&current=temperature_2m,rain&timezone=auto`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    let res: Response;
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const body = (await res.json()) as {
      current?: { temperature_2m?: number; rain?: number };
    };
    return {
      tempC: body.current?.temperature_2m ?? 18,
      isRaining: (body.current?.rain ?? 0) > 0,
      source: body.current?.temperature_2m !== undefined ? "live" : "fallback",
    };
  } catch {
    return { tempC: 18, isRaining: false, source: "fallback" };
  }
}

export interface LocalToday {
  outfits: ScoredOutfit[];
  context: RecommendContext;
  missingSlots: string[];
  /** Personal never-mix pairs that filtered candidates this run. */
  skippedNeverMix: [ColorName, ColorName][];
}

export async function recommendLocal(
  garments: Garment[],
  occasion: Occasion,
  weather: Weather,
  seedOffset = 0,
): Promise<LocalToday> {
  const userId = await getDeviceId();
  const prefs = await loadPrefs();
  const exploreState = await loadExplore();
  const context: RecommendContext = {
    occasion,
    mood: "none",
    weather: { tempC: weather.tempC, isRaining: weather.isRaining },
    now: Date.now() + seedOffset,
  };
  const res = recommend({ userId, wardrobe: garments, context, prefs, exploreState, topK: 3 });
  return {
    outfits: res.outfits,
    context,
    missingSlots: res.meta.missingSlots,
    skippedNeverMix: res.meta.skippedNeverMix,
  };
}

export async function recordPick(
  garments: Garment[],
  picked: ScoredOutfit,
  offered: ScoredOutfit[],
  context: RecommendContext,
): Promise<void> {
  const prefs = await loadPrefs();
  const byId = new Map(garments.map((g) => [g.id, g]));
  const next = updatePreference(prefs, {
    picked,
    rejected: offered.filter((o) => o !== picked),
    garments: byId,
    occasion: context.occasion,
  });
  await savePrefs(next);

  const colors = picked.garmentIds.flatMap(
    (id) => byId.get(id)?.attrs.colors ?? [],
  );
  const pickedSig = outfitSignature(
    picked.garmentIds,
    colors,
    picked.garmentIds.some((id) => byId.get(id)?.attrs.slot === "dress"),
  );
  const offeredSigs = offered.map((o) => {
    const c = o.garmentIds.flatMap((id) => byId.get(id)?.attrs.colors ?? []);
    return outfitSignature(
      o.garmentIds,
      c,
      o.garmentIds.some((id) => byId.get(id)?.attrs.slot === "dress"),
    );
  });
  const explore = await loadExplore();
  await saveExplore(updateExploreState(explore, pickedSig, offeredSigs));
}

/** Copy a camera photo into the app's document directory. */
export async function persistPhoto(uri: string, id: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}garments/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const dest = `${dir}${id}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export function newGarment(id: string, attrs: GarmentAttrs, photoRef: string, originalRef?: string): Garment {
  return {
    id,
    attrs,
    status: "available",
    photoRef,
    originalRef,
    addedAt: Date.now(),
    lastWornAt: null,
    corrections: [],
  };
}
