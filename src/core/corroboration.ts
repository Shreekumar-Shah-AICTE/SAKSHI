import type {
  CorroborationInput,
  CorroborationReason,
  CorroborationReport,
  GrowthStage,
  LossType,
  Verdict,
} from "./types";

/**
 * SAKSHI — multi-signal corroboration engine (gravity component #2).
 *
 * Deterministic, non-AI, no network. Given a loss claim it fuses THREE
 * independent lines of evidence that no single actor can bribe:
 *
 *   1. Sentinel-2 NDVI collapse, interpreted against the crop's growth stage.
 *   2. A weather anomaly expressed as a Z-score vs a 10-year baseline, in the
 *      direction the loss type predicts (heavy rain for a flood, deficit for a
 *      drought, heat for a heatwave).
 *   3. The PMFBY 72-hour reporting window.
 *
 * plus a 4th "integration" term that rewards INDEPENDENT sources agreeing —
 * this cross-signal term is the heart of the VERIFICATION + INTEGRATION moat.
 *
 * The output is a 0..100 score with machine-readable, auditable reasons. The
 * farmer never sees any of this maths (UX law: hide the mechanism); the judge,
 * ombudsman or court can expand every number (dramatize the proof).
 *
 * DESIGN NOTE — why diminishing returns:
 * each signal maps its normalized strength `x` through `1 - e^(-k·x)`. This is
 * a deliberate modelling choice: a single signal, however extreme, can never
 * alone reach certainty (the curve saturates below its cap). Only when several
 * independent signals are simultaneously strong does the score approach 100.
 * The weights below are fixed constants (the model), the inputs are real /
 * seeded data — computation is never faked.
 */

export const ENGINE_VERSION = "corroboration-1.0.0";

/** Point budget per signal. Sums to 100. */
const WEIGHTS = {
  ndvi: 40,
  weather: 40,
  timing: 10,
  consistency: 10,
} as const;

/** Saturation constants, calibrated so genuine extreme events land in the 90s. */
const K_NDVI = 1.3;
const K_WEATHER = 1.3;
const PMFBY_WINDOW_HOURS = 72;

/**
 * The relative NDVI drop (fraction of pre-event greenness lost) that counts as
 * a clearly *significant* collapse for each growth stage. At maturity a crop
 * naturally senesces, so a larger drop is required before it is meaningful;
 * during vegetative/flowering growth even a moderate collapse is diagnostic.
 */
const SIGNIFICANT_DROP: Record<GrowthStage, number> = {
  sowing: 0.5,
  vegetative: 0.35,
  flowering: 0.3,
  maturity: 0.45,
};

/** Human labels for growth stages (English base; the UI localises). */
const STAGE_LABEL: Record<GrowthStage, string> = {
  sowing: "sowing",
  vegetative: "vegetative growth",
  flowering: "flowering",
  maturity: "maturity",
};

/** Which weather quantity + direction corroborates each loss type. */
const WEATHER_EXPECTATION: Record<
  LossType,
  { kind: "rainfall" | "temperature"; direction: 1 | -1; extremeLabel: string }
> = {
  flood: { kind: "rainfall", direction: 1, extremeLabel: "excess rainfall" },
  waterlogging: { kind: "rainfall", direction: 1, extremeLabel: "excess rainfall" },
  flash_flood: { kind: "rainfall", direction: 1, extremeLabel: "excess rainfall" },
  drought: { kind: "rainfall", direction: -1, extremeLabel: "rainfall deficit" },
  heatwave: { kind: "temperature", direction: 1, extremeLabel: "extreme heat" },
  hail: { kind: "rainfall", direction: 1, extremeLabel: "storm rainfall" },
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Diminishing-returns transfer: strength x>=0 -> [0,1), saturating below 1. */
function saturate(x: number, k: number): number {
  if (x <= 0) return 0;
  return 1 - Math.exp(-k * x);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function verdictFor(score: number): Verdict {
  if (score >= 85) return "strongly_corroborated";
  if (score >= 65) return "corroborated";
  if (score >= 40) return "weak";
  return "uncorroborated";
}

// ---------------------------------------------------------------------------

interface SignalResult {
  points: number;
  strength: number; // normalized [0,1)
  reasons: CorroborationReason[];
}

function scoreNdvi(input: CorroborationInput): SignalResult {
  const { before, after } = input.ndvi;
  const stage = input.growthStage;
  const drop = before - after;
  const relativeDrop = clamp(drop / Math.max(before, 0.05), 0, 1);
  const threshold = SIGNIFICANT_DROP[stage];
  const x = relativeDrop / threshold; // >=1 => clearly significant for this stage
  const strength = saturate(x, K_NDVI);
  const points = round1(WEIGHTS.ndvi * strength);

  const reasons: CorroborationReason[] = [];
  if (drop <= 0) {
    reasons.push({
      code: "NDVI_NO_DECLINE",
      label: "Satellite vegetation index did not decline",
      signal: "ndvi",
      points: 0,
      maxPoints: WEIGHTS.ndvi,
      detail: { before, after },
    });
  } else {
    reasons.push({
      code: relativeDrop >= threshold ? "NDVI_COLLAPSE" : "NDVI_DECLINE",
      label:
        relativeDrop >= threshold
          ? "Satellite vegetation index collapsed"
          : "Satellite vegetation index declined",
      signal: "ndvi",
      points,
      maxPoints: WEIGHTS.ndvi,
      detail: {
        before,
        after,
        dropPct: Math.round(relativeDrop * 100),
        stage: STAGE_LABEL[stage],
        significantDropPct: Math.round(threshold * 100),
      },
    });
    if (relativeDrop >= threshold && (stage === "vegetative" || stage === "flowering")) {
      reasons.push({
        code: "GROWTH_STAGE_VULNERABLE",
        label: "Crop was at a vulnerable growth stage",
        signal: "ndvi",
        points: 0,
        maxPoints: 0,
        detail: { stage: STAGE_LABEL[stage] },
      });
    }
  }
  return { points, strength, reasons };
}

function scoreWeather(input: CorroborationInput): SignalResult {
  const exp = WEATHER_EXPECTATION[input.lossType];
  const w = input.weather;
  const z =
    w.baselineStd > 0 ? (w.observed - w.baselineMean) / w.baselineStd : 0;
  // Signed anomaly in the direction the loss type predicts.
  const directional = z * exp.direction;
  const x = Math.max(0, directional) / 2; // a 2-sigma anomaly ~ "significant"
  const strength = saturate(x, K_WEATHER);
  const points = round1(WEIGHTS.weather * strength);
  const pctVsBaseline =
    w.baselineMean !== 0
      ? Math.round(((w.observed - w.baselineMean) / w.baselineMean) * 100)
      : 0;

  const reasons: CorroborationReason[] = [];
  const kindLabel = w.kind === "rainfall" ? "Rainfall" : "Temperature";
  if (directional <= 0) {
    reasons.push({
      code: "WEATHER_DOES_NOT_CORROBORATE",
      label: `${kindLabel} does not corroborate a ${input.lossType.replace("_", " ")}`,
      signal: "weather",
      points: 0,
      maxPoints: WEIGHTS.weather,
      detail: {
        zScore: round1(z),
        observed: round1(w.observed),
        baselineMean: round1(w.baselineMean),
      },
    });
  } else {
    const extreme = directional >= 3;
    reasons.push({
      code: extreme ? "WEATHER_ANOMALY_EXTREME" : "WEATHER_ANOMALY_HIGH",
      label: `${extreme ? "Extreme" : "Significant"} ${exp.extremeLabel} vs 10-year baseline`,
      signal: "weather",
      points,
      maxPoints: WEIGHTS.weather,
      detail: {
        zScore: round1(directional),
        anomalyPct: pctVsBaseline,
        observed: round1(w.observed),
        baselineMean: round1(w.baselineMean),
        unit: w.kind === "rainfall" ? "mm" : "°C",
        window: `${w.windowStart}..${w.windowEnd}`,
      },
    });
  }
  return { points, strength, reasons };
}

function hoursBetween(aIso: string, bIso: string): number {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / 3_600_000;
}

function scoreTiming(input: CorroborationInput): SignalResult {
  const hrs = hoursBetween(input.timing.eventAt, input.timing.reportedAt);
  const reasons: CorroborationReason[] = [];

  if (hrs < 0) {
    reasons.push({
      code: "REPORTED_BEFORE_EVENT",
      label: "Report timestamp precedes the event",
      signal: "timing",
      points: 0,
      maxPoints: WEIGHTS.timing,
      detail: { hoursAfterEvent: round1(hrs) },
    });
    return { points: 0, strength: 0, reasons };
  }

  if (hrs > PMFBY_WINDOW_HOURS) {
    reasons.push({
      code: "OUTSIDE_72H_WINDOW",
      label: "Reported after the PMFBY 72-hour window",
      signal: "timing",
      points: 0,
      maxPoints: WEIGHTS.timing,
      detail: { hoursAfterEvent: round1(hrs), windowHours: PMFBY_WINDOW_HOURS },
    });
    return { points: 0, strength: 0, reasons };
  }

  // Inside the window: a baseline for reporting at all, plus a bonus for speed.
  const earliness = 1 - hrs / PMFBY_WINDOW_HOURS; // 1 = instant, 0 = at the deadline
  const strength = 0.6 + 0.4 * earliness;
  const points = round1(WEIGHTS.timing * strength);
  reasons.push({
    code: "WITHIN_72H_WINDOW",
    label: "Reported within the PMFBY 72-hour window",
    signal: "timing",
    points,
    maxPoints: WEIGHTS.timing,
    detail: { hoursAfterEvent: round1(hrs), windowHours: PMFBY_WINDOW_HOURS },
  });
  return { points, strength, reasons };
}

/**
 * Cross-signal integration term: rewards two INDEPENDENT sources (satellite &
 * weather) both being strong AND temporally aligned. This is what makes SAKSHI
 * a VERIFICATION + INTEGRATION moat rather than a single clever check.
 */
function scoreConsistency(
  input: CorroborationInput,
  ndvi: SignalResult,
  weather: SignalResult,
): SignalResult {
  const agreement = Math.min(ndvi.strength, weather.strength);

  // Temporal alignment: the post-event NDVI scene should fall near the weather
  // anomaly window. Fully aligned within ~15 days, decaying after.
  const anomalyMid =
    (new Date(input.weather.windowStart).getTime() +
      new Date(input.weather.windowEnd).getTime()) /
    2;
  const ndviAfter = new Date(input.ndvi.captureAfter).getTime();
  const daysApart = Math.abs(ndviAfter - anomalyMid) / 86_400_000;
  const alignment = clamp(1 - daysApart / 15, 0, 1);

  const strength = agreement * alignment;
  const points = round1(WEIGHTS.consistency * strength);

  const reasons: CorroborationReason[] = [];
  if (points > 0) {
    reasons.push({
      code: "DUAL_SOURCE_AGREEMENT",
      label: "Independent satellite and weather sources agree",
      signal: "consistency",
      points,
      maxPoints: WEIGHTS.consistency,
      detail: { daysBetweenSignals: Math.round(daysApart) },
    });
  }
  return { points, strength, reasons };
}

/**
 * Compute the corroboration report for a loss claim. Pure and deterministic:
 * the same input always yields the same score and reasons. `now` is injectable
 * purely for stable timestamps in tests; it never affects the score.
 */
export function corroborate(
  input: CorroborationInput,
  now: string = new Date().toISOString(),
): CorroborationReport {
  const ndvi = scoreNdvi(input);
  const weather = scoreWeather(input);
  const timing = scoreTiming(input);
  const consistency = scoreConsistency(input, ndvi, weather);

  const rawScore =
    ndvi.points + weather.points + timing.points + consistency.points;
  const score = clamp(Math.round(rawScore), 0, 100);

  const reasons = [
    ...ndvi.reasons,
    ...weather.reasons,
    ...timing.reasons,
    ...consistency.reasons,
  ];

  return {
    score,
    verdict: verdictFor(score),
    reasons,
    components: {
      ndvi: ndvi.points,
      weather: weather.points,
      timing: timing.points,
      consistency: consistency.points,
    },
    computedAt: now,
    engineVersion: ENGINE_VERSION,
  };
}
