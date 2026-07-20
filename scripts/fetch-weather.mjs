#!/usr/bin/env node
/**
 * SAKSHI — provenance script for the seeded weather fixtures.
 *
 * This is the exact script used to derive the REAL rainfall / temperature
 * numbers baked into src/data/seed/churu-events.ts. It calls the free, keyless
 * Open-Meteo ERA5 archive for each field's coordinates and computes, for the
 * event window, the 2025 observed total vs the same-calendar-window baseline
 * across 2015–2024 (mean, standard deviation, Z-score, % anomaly).
 *
 * Run:  node scripts/fetch-weather.mjs
 *
 * It prints a table you can diff against the committed fixtures — proof that
 * the corroboration inputs are genuine data, not invented numbers.
 */

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

const EVENTS = [
  { id: "event-churu-flood-2025", lat: 28.296, lng: 74.966, field: "precipitation_sum", start: "2025-08-23", end: "2025-08-26" },
  { id: "event-sardar-waterlog-2025", lat: 28.443, lng: 74.492, field: "precipitation_sum", start: "2025-07-30", end: "2025-08-03" },
  { id: "event-rajgarh-flashflood-2025", lat: 28.641, lng: 75.383, field: "precipitation_sum", start: "2025-08-22", end: "2025-08-25" },
  { id: "event-taranagar-heat-2025", lat: 28.671, lng: 75.037, field: "temperature_2m_max", start: "2025-06-08", end: "2025-06-16" },
  { id: "event-ratangarh-hail-2025", lat: 28.079, lng: 74.618, field: "precipitation_sum", start: "2025-07-30", end: "2025-08-02" },
];

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};
const doy = (d) => {
  const dt = new Date(d + "T00:00:00Z");
  const start = Date.UTC(dt.getUTCFullYear(), 0, 0);
  return Math.floor((dt - start) / 86400000);
};

async function run() {
  for (const e of EVENTS) {
    const isTemp = e.field === "temperature_2m_max";
    const params = new URLSearchParams({
      latitude: String(e.lat),
      longitude: String(e.lng),
      start_date: "2015-01-01",
      end_date: "2025-12-31",
      daily: e.field,
      timezone: "Asia/Kolkata",
    });
    const res = await fetch(`${ARCHIVE_URL}?${params}`);
    const json = await res.json();
    const t = json.daily.time;
    const v = json.daily[e.field];
    const s = doy(e.start);
    const en = doy(e.end);

    if (isTemp) {
      const sum = {};
      const cnt = {};
      for (let i = 0; i < t.length; i++) {
        const y = +t[i].slice(0, 4);
        const dd = doy(t[i]);
        if (dd >= s && dd <= en) {
          sum[y] = (sum[y] || 0) + (v[i] ?? 0);
          cnt[y] = (cnt[y] || 0) + 1;
        }
      }
      const avg = (y) => sum[y] / cnt[y];
      const cur = avg(2025);
      const base = [];
      for (let y = 2015; y <= 2024; y++) base.push(avg(y));
      const bM = mean(base);
      const bS = std(base);
      console.log(
        `${e.id.padEnd(32)} tmax observed=${cur.toFixed(1)}°C baseline=${bM.toFixed(1)}°C std=${bS.toFixed(2)} z=${((cur - bM) / bS).toFixed(2)}`,
      );
    } else {
      const by = {};
      for (let i = 0; i < t.length; i++) {
        const y = +t[i].slice(0, 4);
        const dd = doy(t[i]);
        if (dd >= s && dd <= en) by[y] = (by[y] || 0) + (v[i] ?? 0);
      }
      const cur = by[2025];
      const base = [];
      for (let y = 2015; y <= 2024; y++) base.push(by[y] ?? 0);
      const bM = mean(base);
      const bS = std(base);
      console.log(
        `${e.id.padEnd(32)} rain observed=${cur.toFixed(1)}mm baseline=${bM.toFixed(1)}mm std=${bS.toFixed(2)} z=${((cur - bM) / bS).toFixed(2)} anomaly=${Math.round(((cur - bM) / bM) * 100)}%`,
      );
    }
  }
}

run().catch((err) => {
  console.error("Open-Meteo fetch failed:", err.message);
  process.exit(1);
});
