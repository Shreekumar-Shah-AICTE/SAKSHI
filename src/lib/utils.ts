/** Small presentational helpers shared across the SAKSHI UI. */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Map an NDVI value (0..1) to a colour on the living→dead ramp used for the
 * satellite green→brown Moment. Healthy canopy is green; collapse is brown.
 */
export function ndviColor(v: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [0x5a, 0x39, 0x1f]], // bare/dead soil — brown
    [0.2, [0x8a, 0x5a, 0x2b]], // stressed — ochre-brown
    [0.4, [0xb9, 0xc1, 0x5a]], // patchy — olive
    [0.6, [0x57, 0xd9, 0x7e]], // healthy — leaf green
    [0.85, [0x2f, 0xbf, 0x5b]], // vigorous — deep green
  ];
  const x = Math.max(0, Math.min(0.85, v));
  let lo = stops[0];
  let hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (x >= stops[i][0] && x <= stops[i + 1][0]) {
      lo = stops[i];
      hi = stops[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : (x - lo[0]) / (hi[0] - lo[0]);
  const c = [0, 1, 2].map((i) => Math.round(lo[1][i] + (hi[1][i] - lo[1][i]) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const IST = "en-IN";

export function formatDateIST(iso: string): string {
  try {
    return new Date(iso).toLocaleString(IST, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

export function formatDayIST(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(IST, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

export function shortHash(hash: string, head = 10, tail = 6): string {
  if (hash.length <= head + tail) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}
