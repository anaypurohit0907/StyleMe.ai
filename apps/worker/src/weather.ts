/**
 * Open-Meteo — free, no API key.
 * In-memory per-instance cache, 30 min TTL. (Worker instances are warm,
 * so repeat calls for the same city hit the cache.)
 */
import type { WeatherContext } from "@styleme/schema";

const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  weather: WeatherContext;
  at: number;
}

export function createWeatherCache(): Map<string, CacheEntry> {
  return new Map();
}

export async function fetchWeather(
  cache: Map<string, CacheEntry>,
  city?: string,
  lat?: number,
  lon?: number,
): Promise<WeatherContext> {
  const key =
    lat != null && lon != null ? `ll:${lat.toFixed(2)},${lon.toFixed(2)}` : `city:${(city ?? "").toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.weather;

  let a: number;
  let b: number;
  if (lat != null && lon != null) {
    a = lat;
    b = lon;
  } else if (city) {
    const geo = (await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`,
    ).then((r) => r.json())) as { results?: Array<{ latitude: number; longitude: number }> };
    const place = geo.results?.[0];
    if (!place) throw new Error(`city not found: ${city}`);
    a = place.latitude;
    b = place.longitude;
  } else {
    throw new Error("weather needs city or lat/lon");
  }

  const res = (await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&current=temperature_2m,precipitation,rain&timezone=auto`,
  ).then((r) => {
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    return r.json();
  })) as { current: { temperature_2m: number; precipitation?: number } };
  const weather: WeatherContext = {
    tempC: Math.round(res.current.temperature_2m * 10) / 10,
    isRaining: (res.current.precipitation ?? 0) > 0,
  };
  cache.set(key, { weather, at: Date.now() });
  return weather;
}
