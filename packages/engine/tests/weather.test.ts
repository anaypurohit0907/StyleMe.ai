import { describe, expect, it } from "vitest";
import {
  FALLBACK_WEATHER,
  parseForecastResponse,
  parseGeocodeResponse,
  parseStoredCoords,
} from "@styleme/schema/weather";

describe("weather source (T-068)", () => {
  it("parses a valid Open-Meteo geocode response", () => {
    const out = parseGeocodeResponse({
      results: [{ latitude: 52.52, longitude: 13.405, name: "Berlin" }],
    });
    expect(out).toEqual({ lat: 52.52, lon: 13.405, name: "Berlin" });
  });

  it("rejects empty, malformed, or out-of-range geocodes", () => {
    expect(parseGeocodeResponse({ results: [] })).toBeNull();
    expect(parseGeocodeResponse({})).toBeNull(); // no results key
    expect(parseGeocodeResponse(null)).toBeNull();
    expect(parseGeocodeResponse("Berlin")).toBeNull();
    expect(
      parseGeocodeResponse({ results: [{ latitude: "x", longitude: 1 }] }),
    ).toBeNull();
    // NaN coords must never reach the forecast URL.
    expect(
      parseGeocodeResponse({ results: [{ latitude: 999, longitude: 0 }] }),
    ).toBeNull();
  });

  it("round-trips stored coords through parseStoredCoords", () => {
    const coords = parseGeocodeResponse({
      results: [{ latitude: 19.07, longitude: 72.87, name: "Mumbai" }],
    });
    expect(coords).not.toBeNull();
    const stored = parseStoredCoords(JSON.stringify(coords));
    expect(stored).toEqual(coords);
    // Corrupt/stale meta degrades to null, never to garbage coords.
    expect(parseStoredCoords("not json")).toBeNull();
    expect(parseStoredCoords(null)).toBeNull();
  });

  it("parses a live forecast and flags rain honestly", () => {
    const live = parseForecastResponse({
      current: { temperature_2m: 15.2, rain: 0.4 },
    });
    expect(live).toEqual({ tempC: 15.2, isRaining: true, source: "live" });
    expect(
      parseForecastResponse({ current: { temperature_2m: 15, rain: 0 } })?.isRaining,
    ).toBe(false);
  });

  it("falls back when the forecast is missing or impossible", () => {
    // Missing temperature = not live (the old code guessed 18 silently).
    expect(parseForecastResponse({ current: { rain: 1 } })).toBeNull();
    expect(parseForecastResponse({ current: { temperature_2m: 999 } })).toBeNull();
    expect(parseForecastResponse({})).toBeNull();
    expect(FALLBACK_WEATHER).toEqual({
      tempC: 18,
      isRaining: false,
      source: "fallback",
    });
    expect(Object.isFrozen(FALLBACK_WEATHER)).toBe(true);
  });
});
