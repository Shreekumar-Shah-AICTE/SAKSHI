import type { LatLng, WeatherSignal } from "@/core/types";
import { getEvent, getField } from "@/data/seed/churu-events";

/**
 * SAKSHI — weather adapter (Open-Meteo).
 *
 * Open-Meteo's ERA5 archive is free and needs NO API key, so the live path can
 * run even on a keyless deployment. It is still treated as progressive
 * enhancement: any failure (offline, rate-limit, schema change) FAILS CLOSED to
 * the seeded 10-year baseline captured in the fixtures, so the golden path is
 * never at the mercy of the network.
 *
 * The anomaly is computed exactly as the seed fixtures were: sum the event
 * window's rainfall in 2025 and compare it to the same calendar window across
 * 2015–2024 to get a mean, standard deviation and Z-score.
 */

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

function mean(a: number[]): number {
  return a.reduce((s, x) => s + x, 0) / a.length;
}
function std(a: number[]): number {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
}
function dayOfYear(iso: string): number {
  const d = new Date(iso + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Return the seeded (fail-closed) weather signal for an event. */
export function seededWeather(eventId: string): WeatherSignal | undefined {
  return getEvent(eventId)?.weather;
}

/**
 * Genuinely call Open-Meteo and recompute the anomaly for a coordinate/window.
 * Used for the "live" badge and optional refresh. Throws on any failure so the
 * caller can fail closed.
 */
export async function fetchLiveRainfallAnomaly(
  coord: LatLng,
  windowStart: string,
  windowEnd: string,
  signal?: AbortSignal,
): Promise<WeatherSignal> {
  const params = new URLSearchParams({
    latitude: coord.lat.toFixed(4),
    longitude: coord.lng.toFixed(4),
    start_date: "2015-01-01",
    end_date: `${new Date(windowEnd).getUTCFullYear()}-12-31`,
    daily: "precipitation_sum",
    timezone: "Asia/Kolkata",
  });
  const res = await fetch(`${ARCHIVE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = (await res.json()) as {
    daily?: { time: string[]; precipitation_sum: number[] };
  };
  const daily = json.daily;
  if (!daily?.time?.length) throw new Error("Open-Meteo: empty archive");

  const s = dayOfYear(windowStart);
  const e = dayOfYear(windowEnd);
  const eventYear = new Date(windowEnd).getUTCFullYear();
  const byYear: Record<number, number> = {};
  for (let i = 0; i < daily.time.length; i++) {
    const t = daily.time[i];
    const y = Number(t.slice(0, 4));
    const dd = dayOfYear(t);
    if (dd >= s && dd <= e) byYear[y] = (byYear[y] ?? 0) + (daily.precipitation_sum[i] ?? 0);
  }
  const observed = byYear[eventYear] ?? 0;
  const base: number[] = [];
  for (let y = 2015; y <= 2024; y++) base.push(byYear[y] ?? 0);

  return {
    kind: "rainfall",
    observed: Math.round(observed * 10) / 10,
    baselineMean: Math.round(mean(base) * 10) / 10,
    baselineStd: Math.round(std(base) * 100) / 100,
    windowStart,
    windowEnd,
    source: "open-meteo-live",
  };
}

/**
 * Resolve the weather signal for an event: live when explicitly enabled AND the
 * loss is rainfall-driven, otherwise the seeded baseline. Always fails closed.
 */
export async function resolveWeather(
  eventId: string,
  opts: { live?: boolean; timeoutMs?: number } = {},
): Promise<{ signal: WeatherSignal; live: boolean }> {
  const event = getEvent(eventId);
  const seeded = event?.weather;
  if (!event || !seeded) throw new Error(`Unknown event ${eventId}`);

  const wantLive = opts.live && seeded.kind === "rainfall";
  if (!wantLive) return { signal: seeded, live: false };

  const field = getField(event.fieldId);
  const coord = field ? field.polygon.ring[0] : event.capture.gps;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs ?? 6000);
  try {
    const signal = await fetchLiveRainfallAnomaly(
      { lat: event.capture.gps.lat, lng: event.capture.gps.lng },
      seeded.windowStart,
      seeded.windowEnd,
      controller.signal,
    );
    return { signal, live: true };
  } catch {
    // FAIL CLOSED to the seeded baseline — the golden path must never break.
    return { signal: seeded, live: false };
  } finally {
    clearTimeout(t);
  }
}
