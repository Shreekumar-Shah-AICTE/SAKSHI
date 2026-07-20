import type { NdviSignal } from "@/core/types";
import { getEvent } from "@/data/seed/churu-events";

/**
 * SAKSHI — Sentinel-2 NDVI adapter.
 *
 * Live NDVI needs authenticated Copernicus Data Space access (OAuth client
 * credentials + the Sentinel Hub Statistical API) to sample the field polygon
 * and compute a cloud-masked NDVI before/after the event. That is real but
 * key-gated, so it sits behind this interface as progressive enhancement.
 *
 * With no COPERNICUS_* credentials configured, the adapter FAILS CLOSED to the
 * seeded, realistic Sentinel-2 NDVI values for the five Churu events — which is
 * exactly what the deterministic corroboration engine consumes on the golden
 * path.
 */

export function seededNdvi(eventId: string): NdviSignal | undefined {
  return getEvent(eventId)?.ndvi;
}

function copernicusConfigured(): boolean {
  return Boolean(process.env.COPERNICUS_CLIENT_ID && process.env.COPERNICUS_CLIENT_SECRET);
}

/**
 * Resolve the NDVI signal for an event. Returns the live source label only when
 * credentials exist; otherwise the seeded values. The live branch intentionally
 * throws "not configured" and falls back, so the code path is exercised and
 * honest rather than pretending to have data it does not.
 */
export async function resolveNdvi(
  eventId: string,
  opts: { live?: boolean } = {},
): Promise<{ signal: NdviSignal; live: boolean }> {
  const seeded = seededNdvi(eventId);
  if (!seeded) throw new Error(`Unknown event ${eventId}`);

  if (opts.live && copernicusConfigured()) {
    try {
      // A real implementation would request the Statistical API here for the
      // field polygon and event dates. Not wired without credentials.
      throw new Error("Sentinel-2 live sampling not wired in this build");
    } catch {
      return { signal: seeded, live: false };
    }
  }
  return { signal: seeded, live: false };
}

/**
 * A tiny, deterministic NDVI "scene" for the before/after satellite visual:
 * a coarse grid of per-cell NDVI values derived from the field's mean NDVI plus
 * a fixed pseudo-random texture. Pure and seedable so the UI renders identically
 * everywhere (no real imagery needed for the Moment).
 */
export function ndviScene(meanNdvi: number, seed: number, size = 8): number[][] {
  const grid: number[][] = [];
  let s = seed >>> 0;
  const rand = () => {
    // Mulberry32 — deterministic PRNG.
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const jitter = (rand() - 0.5) * 0.18;
      row.push(Math.max(0, Math.min(1, meanNdvi + jitter)));
    }
    grid.push(row);
  }
  return grid;
}
