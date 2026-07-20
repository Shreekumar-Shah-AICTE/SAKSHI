import type { EventBundle } from "@/data/store";
import { ndviScene } from "@/adapters/sentinel";
import type { CorroborationReason } from "@/core/types";

/**
 * Server-side view model. Turns a ledger bundle into a compact, serialisable
 * shape for the client — and pre-computes the *proof* the UI dramatizes
 * (satellite green→brown scenes, the rainfall/temperature stamp, the NDVI drop)
 * while never leaking the raw mechanism unless the "How was this verified?"
 * disclosure asks for it.
 */

export interface WeatherView {
  kind: "rainfall" | "temperature";
  observed: number;
  baselineMean: number;
  baselineStd: number;
  zScore: number;
  anomalyPct: number;
  windowStart: string;
  windowEnd: string;
  unit: string;
  live: boolean;
  /** Headline stamp, e.g. "+720% rainfall" or "43°C · +2.3σ heat". */
  stamp: string;
}

export interface ReceiptView {
  eventId: string;
  sealed: boolean;

  farmerName: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  langPref: string;

  crop: string;
  khasra: string;
  areaHa: number;
  lossLabel: string;
  lossType: string;
  growthStage: string;

  eventAt: string;
  reportedAt: string;
  hoursToReport: number;
  within72h: boolean;

  gps: { lat: number; lng: number; accuracyM: number };
  geofenceInside: boolean;
  geofenceDistanceM: number;

  ndvi: {
    before: number;
    after: number;
    dropPct: number;
    sceneBefore: number[][];
    sceneAfter: number[][];
  };

  weather: WeatherView;

  narration: { lang: string; spoken: string; translit: string; english: string }[];

  score: number | null;
  verdict: string | null;
  components: { ndvi: number; weather: number; timing: number; consistency: number } | null;
  reasons: CorroborationReason[];

  receiptHash: string | null;
  prevHash: string | null;
  index: number | null;
  timestamp: string | null;
  payloadHash: string | null;
  mediaSha256: string | null;

  story: string;
}

function round(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function buildReceiptView(bundle: EventBundle): ReceiptView {
  const { event, farmer, field, receipt, report } = bundle;
  const w = event.weather;
  const z = w.baselineStd > 0 ? (w.observed - w.baselineMean) / w.baselineStd : 0;
  const anomalyPct =
    w.baselineMean !== 0 ? Math.round(((w.observed - w.baselineMean) / w.baselineMean) * 100) : 0;

  const hours = round(
    (new Date(event.reportedAt).getTime() - new Date(event.eventAt).getTime()) / 3_600_000,
    0,
  );

  const stamp =
    w.kind === "rainfall"
      ? `${anomalyPct >= 0 ? "+" : ""}${anomalyPct}% rainfall`
      : `${round(w.observed, 0)}°C · +${round(z, 1)}σ heat`;

  const dropPct = Math.round(((event.ndvi.before - event.ndvi.after) / event.ndvi.before) * 100);

  // Deterministic satellite scenes keyed off the event id so they render
  // identically on every device (no real imagery required for the Moment).
  const seedNum = Array.from(event.id).reduce((a, c) => a + c.charCodeAt(0), 0);

  return {
    eventId: event.id,
    sealed: bundle.sealed,

    farmerName: farmer.name,
    village: farmer.village,
    tehsil: farmer.tehsil,
    district: farmer.district,
    state: farmer.state,
    langPref: farmer.langPref,

    crop: field.cropLabel,
    khasra: field.khasra,
    areaHa: field.areaHa,
    lossLabel: event.lossLabel,
    lossType: event.lossType,
    growthStage: event.growthStage,

    eventAt: event.eventAt,
    reportedAt: event.reportedAt,
    hoursToReport: hours,
    within72h: hours >= 0 && hours <= 72,

    gps: event.capture.gps,
    geofenceInside: receipt?.payload.geofence.inside ?? true,
    geofenceDistanceM: receipt?.payload.geofence.distanceM ?? 0,

    ndvi: {
      before: event.ndvi.before,
      after: event.ndvi.after,
      dropPct,
      sceneBefore: ndviScene(event.ndvi.before, seedNum),
      sceneAfter: ndviScene(event.ndvi.after, seedNum),
    },

    weather: {
      kind: w.kind,
      observed: round(w.observed),
      baselineMean: round(w.baselineMean),
      baselineStd: round(w.baselineStd, 2),
      zScore: round(z, 1),
      anomalyPct,
      windowStart: w.windowStart,
      windowEnd: w.windowEnd,
      unit: w.kind === "rainfall" ? "mm" : "°C",
      live: w.source === "open-meteo-live",
      stamp,
    },

    narration: event.narration,

    score: report?.score ?? null,
    verdict: report?.verdict ?? null,
    components: report?.components ?? null,
    reasons: report?.reasons ?? [],

    receiptHash: receipt?.hash ?? null,
    prevHash: receipt?.prevHash ?? null,
    index: receipt?.index ?? null,
    timestamp: receipt?.timestamp ?? null,
    payloadHash: receipt?.payloadHash ?? null,
    mediaSha256: receipt?.payload.mediaSha256 ?? null,

    story: event.story,
  };
}
