import { describe, it, expect } from "vitest";
import { corroborate, ENGINE_VERSION } from "./corroboration";
import type { CorroborationInput } from "./types";
import { EVENTS, FLAGSHIP_EVENT_ID, type SeedEvent } from "@/data/seed/churu-events";

function toInput(e: SeedEvent): CorroborationInput {
  return {
    lossType: e.lossType,
    growthStage: e.growthStage,
    ndvi: e.ndvi,
    weather: e.weather,
    timing: { eventAt: e.eventAt, reportedAt: e.reportedAt },
  };
}

const FIXED_NOW = "2025-08-26T12:30:00+05:30";

describe("corroborate — the flagship Moment", () => {
  const flagship = EVENTS.find((e) => e.id === FLAGSHIP_EVENT_ID)!;
  const report = corroborate(toInput(flagship), FIXED_NOW);

  it("computes Sunita Devi's Churu flood to exactly 94/100 from real data", () => {
    expect(report.score).toBe(94);
  });

  it("is 'strongly corroborated'", () => {
    expect(report.verdict).toBe("strongly_corroborated");
  });

  it("surfaces the NDVI collapse, extreme rainfall, 72h window and dual-source agreement", () => {
    const codes = report.reasons.map((r) => r.code);
    expect(codes).toContain("NDVI_COLLAPSE");
    expect(codes).toContain("WEATHER_ANOMALY_EXTREME");
    expect(codes).toContain("WITHIN_72H_WINDOW");
    expect(codes).toContain("DUAL_SOURCE_AGREEMENT");
  });

  it("exposes the real rainfall anomaly (+720% vs 10-year baseline) in the reasons", () => {
    const rain = report.reasons.find((r) => r.code === "WEATHER_ANOMALY_EXTREME")!;
    expect(rain.detail.anomalyPct).toBe(720);
    expect(Number(rain.detail.zScore)).toBeGreaterThan(5);
  });

  it("components sum (rounded) to the score and each stays within its cap", () => {
    const c = report.components;
    expect(c.ndvi).toBeLessThanOrEqual(40);
    expect(c.weather).toBeLessThanOrEqual(40);
    expect(c.timing).toBeLessThanOrEqual(10);
    expect(c.consistency).toBeLessThanOrEqual(10);
    expect(Math.round(c.ndvi + c.weather + c.timing + c.consistency)).toBe(94);
  });

  it("stamps the engine version", () => {
    expect(report.engineVersion).toBe(ENGINE_VERSION);
  });
});

describe("corroborate — determinism", () => {
  it("returns identical results for identical inputs", () => {
    const e = EVENTS[0];
    const a = corroborate(toInput(e), FIXED_NOW);
    const b = corroborate(toInput(e), FIXED_NOW);
    expect(a).toEqual(b);
  });
});

describe("corroborate — all 5 seeded Churu events land in defensible bands", () => {
  it("scores every seed event and ranks the flagship at the top band", () => {
    const scored = EVENTS.map((e) => ({ id: e.id, score: corroborate(toInput(e), FIXED_NOW).score }));
    for (const s of scored) {
      expect(s.score).toBeGreaterThanOrEqual(60); // all are genuine, well-supported events
      expect(s.score).toBeLessThanOrEqual(100);
    }
    const flagship = scored.find((s) => s.id === FLAGSHIP_EVENT_ID)!;
    expect(flagship.score).toBe(94);
  });

  it("discriminates: the June heatwave scores lower than the flagship flood", () => {
    const heat = corroborate(
      toInput(EVENTS.find((e) => e.id === "event-taranagar-heat-2025")!),
      FIXED_NOW,
    ).score;
    expect(heat).toBeLessThan(94);
    expect(heat).toBeGreaterThanOrEqual(60);
  });
});

describe("corroborate — signal direction & guards", () => {
  const base = toInput(EVENTS.find((e) => e.id === FLAGSHIP_EVENT_ID)!);

  it("a bigger NDVI collapse never decreases the score (monotonic)", () => {
    const shallow = corroborate({ ...base, ndvi: { ...base.ndvi, after: 0.4 } }, FIXED_NOW).score;
    const deep = corroborate({ ...base, ndvi: { ...base.ndvi, after: 0.1 } }, FIXED_NOW).score;
    expect(deep).toBeGreaterThanOrEqual(shallow);
  });

  it("zeroes the timing signal when reported after the 72h window", () => {
    const late = corroborate(
      { ...base, timing: { eventAt: base.timing.eventAt, reportedAt: "2025-09-10T00:00:00+05:30" } },
      FIXED_NOW,
    );
    expect(late.components.timing).toBe(0);
    expect(late.reasons.map((r) => r.code)).toContain("OUTSIDE_72H_WINDOW");
    expect(late.score).toBeLessThan(94);
  });

  it("does not corroborate a 'flood' when rainfall is actually below baseline", () => {
    const dry = corroborate(
      {
        ...base,
        weather: { ...base.weather, observed: 2, baselineMean: 20, baselineStd: 8 },
      },
      FIXED_NOW,
    );
    expect(dry.components.weather).toBe(0);
    expect(dry.reasons.map((r) => r.code)).toContain("WEATHER_DOES_NOT_CORROBORATE");
  });

  it("corroborates a drought via a rainfall DEFICIT (opposite direction)", () => {
    const drought = corroborate(
      {
        lossType: "drought",
        growthStage: "flowering",
        ndvi: { before: 0.55, after: 0.2, captureBefore: "2025-07-01", captureAfter: "2025-08-15", source: "sentinel-2-seed" },
        weather: {
          kind: "rainfall",
          observed: 6,
          baselineMean: 110,
          baselineStd: 28,
          windowStart: "2025-07-15",
          windowEnd: "2025-08-15",
          source: "open-meteo-seed",
        },
        timing: { eventAt: "2025-08-14T00:00:00+05:30", reportedAt: "2025-08-16T00:00:00+05:30" },
      },
      FIXED_NOW,
    );
    expect(drought.components.weather).toBeGreaterThan(0);
    expect(drought.reasons.map((r) => r.code)).toContain("WEATHER_ANOMALY_EXTREME");
  });

  it("an uncorroborated claim (no NDVI drop, normal weather, late) scores low", () => {
    const weak = corroborate(
      {
        lossType: "flood",
        growthStage: "maturity",
        ndvi: { before: 0.5, after: 0.49, captureBefore: "2025-08-01", captureAfter: "2025-08-20", source: "sentinel-2-seed" },
        weather: { kind: "rainfall", observed: 10, baselineMean: 12, baselineStd: 6, windowStart: "2025-08-10", windowEnd: "2025-08-13", source: "open-meteo-seed" },
        timing: { eventAt: "2025-08-01T00:00:00+05:30", reportedAt: "2025-08-20T00:00:00+05:30" },
      },
      FIXED_NOW,
    );
    expect(weak.score).toBeLessThan(40);
    expect(weak.verdict).toBe("uncorroborated");
  });
});
