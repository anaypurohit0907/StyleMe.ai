/**
 * Pure weather-source helpers (T-068): parse Open-Meteo's geocoding and
 * forecast responses and decide the honest fallback ladder. No network, no
 * device APIs — the app side (`apps/mobile/src/lib/local.ts`) fetches and
 * persists; these functions only validate + shape data, so they are testable
 * from the engine vitest suite (same pattern as `corrections.ts`).
 */

/** Cached city coordinates, persisted in meta as `weatherLatLon`. */
export interface WeatherLatLon {
  lat: number;
  lon: number;
  /** Resolved display name from the geocoder (may differ from the raw input). */
  name?: string;
}

function validCoords(lat: number, lon: number, name?: unknown): WeatherLatLon | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (typeof name === "string" && name.length > 0) return { lat, lon, name };
  return { lat, lon };
}

/**
 * Parse Open-Meteo geocoding (`geocoding-api.open-meteo.com/v1/search`):
 * `{ results?: [{ latitude, longitude, name? }] }`. Returns the first
 * result, or null for anything malformed / empty — a bad city string must
 * degrade to the offline fallback, never to NaN coordinates.
 */
export function parseGeocodeResponse(json: unknown): WeatherLatLon | null {
  if (typeof json !== "object" || json === null) return null;
  const results = (json as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0] as Record<string, unknown> | null;
  if (typeof first !== "object" || first === null) return null;
  return validCoords(Number(first.latitude), Number(first.longitude), first.name);
}

/** Read a stored `weatherLatLon` meta value (JSON string) back to coords. */
export function parseStoredCoords(raw: string | null | undefined): WeatherLatLon | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return validCoords(Number(obj.lat), Number(obj.lon), obj.name);
  } catch {
    return null;
  }
}

export interface WeatherReading {
  tempC: number;
  isRaining: boolean;
  /** "live" = read from the forecast API this call; "fallback" = the 18 °C guess. */
  source: "live" | "fallback";
}

export const FALLBACK_WEATHER: WeatherReading = Object.freeze({
  tempC: 18,
  isRaining: false,
  source: "fallback",
});

/**
 * Parse Open-Meteo forecast (`api.open-meteo.com/v1/forecast`, current block):
 * `{ current?: { temperature_2m?, rain? } }`. Missing temperature = not live.
 */
export function parseForecastResponse(json: unknown): WeatherReading | null {
  if (typeof json !== "object" || json === null) return null;
  const current = (json as { current?: Record<string, unknown> }).current;
  if (typeof current !== "object" || current === null) return null;
  const tempC = Number(current.temperature_2m);
  if (!Number.isFinite(tempC) || tempC < -60 || tempC > 60) return null;
  const rain = Number(current.rain ?? 0);
  return {
    tempC,
    isRaining: Number.isFinite(rain) && rain > 0,
    source: "live",
  };
}
