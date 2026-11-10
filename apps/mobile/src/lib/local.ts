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
import { metaGet, metaSet } from "./db";

export async function getDeviceId(): Promise<string> {
  const existing = await metaGet("deviceId");
  if (existing) return existing;
  const id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
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

export async function savePrefs(p: PreferenceVector): Promise<void> {
  await metaSet("prefs", JSON.stringify(p));
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
}

/** Open-Meteo, no API key. Falls back to a mild default offline. */
export async function getWeather(): Promise<Weather> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return { tempC: 18, isRaining: false };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}` +
      `&longitude=${pos.coords.longitude}&current=temperature_2m,rain&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const body = (await res.json()) as {
      current?: { temperature_2m?: number; rain?: number };
    };
    return {
      tempC: body.current?.temperature_2m ?? 18,
      isRaining: (body.current?.rain ?? 0) > 0,
    };
  } catch {
    return { tempC: 18, isRaining: false };
  }
}

export interface LocalToday {
  outfits: ScoredOutfit[];
  context: RecommendContext;
  missingSlots: string[];
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
  return { outfits: res.outfits, context, missingSlots: res.meta.missingSlots };
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

export function newGarment(id: string, attrs: GarmentAttrs, photoRef: string): Garment {
  return {
    id,
    attrs,
    status: "available",
    photoRef,
    addedAt: Date.now(),
    lastWornAt: null,
    corrections: [],
  };
}
