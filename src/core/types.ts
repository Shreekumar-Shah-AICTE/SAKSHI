/**
 * SAKSHI — Gravity Core types.
 *
 * These types describe the two deterministic, non-AI "gravity" components that
 * ARE the moat:
 *   1. the tamper-evident evidence pipeline (hash-chain), and
 *   2. the multi-signal corroboration engine.
 *
 * Litmus test (from the build doctrine): remove every LLM / API call — is
 * there still interesting computer science here? Yes: everything in this file
 * and its siblings runs with zero network, zero keys, and is fully testable.
 */

// ---------------------------------------------------------------------------
// Geospatial primitives
// ---------------------------------------------------------------------------

/** A WGS84 coordinate. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A GPS fix extracted from a captured photo/video (EXIF) or the live device. */
export interface GpsFix extends LatLng {
  /** Horizontal accuracy in metres, if the device/EXIF reported it. */
  accuracyM?: number;
}

/** A registered field boundary. Ring is an ordered list of vertices (lat/lng). */
export interface FieldPolygon {
  id: string;
  /** Ordered ring; first and last point need NOT be duplicated. */
  ring: LatLng[];
}

/** Result of testing a GPS fix against a registered field polygon. */
export interface GeofenceResult {
  polygonId: string;
  /** true if the point lies inside (or on the boundary of) the field. */
  inside: boolean;
  /** Signed-ish distance to the polygon boundary in metres (>=0). 0 if inside. */
  distanceM: number;
}

// ---------------------------------------------------------------------------
// Hash-chain (tamper-evident evidence pipeline)
// ---------------------------------------------------------------------------

/** Device / capture attestation captured alongside the media. */
export interface DeviceAttestation {
  platform: string;
  /** Best-effort, e.g. "gps" | "network" | "seed". */
  locationSource: string;
  /** Whether the capture happened live in-app vs an uploaded file. */
  liveCapture: boolean;
}

/**
 * The immutable content of an evidence receipt. Everything a court, ombudsman
 * or DGRC would need to independently re-verify the claim. This object is
 * hashed canonically; changing ANY field changes the receipt hash.
 */
export interface ReceiptPayload {
  eventId: string;
  fieldId: string;
  farmerId: string;
  /** Device timestamp at capture (ISO 8601). */
  capturedAt: string;
  gps: GpsFix;
  geofence: GeofenceResult;
  /** SHA-256 of the raw media bytes (photo/video). */
  mediaSha256: string;
  lossType: string;
  narrationLang: string;
  /** Optional transcript of the farmer's spoken sentence. */
  narrationText?: string;
  attestation?: DeviceAttestation;
}

/**
 * One link in the append-only chain. Each receipt embeds the hash of the
 * previous receipt, so any tampering (edit, insert, delete, reorder) breaks the
 * chain and is mathematically detectable by `verifyChain`.
 */
export interface EvidenceReceipt {
  /** 0-based position in the chain. */
  index: number;
  /** When this receipt was sealed (ISO 8601). */
  timestamp: string;
  /** Hash of the previous receipt, or the genesis root for index 0. */
  prevHash: string;
  payload: ReceiptPayload;
  /** SHA-256 of the canonical payload. */
  payloadHash: string;
  /** SHA-256 of {index, timestamp, prevHash, payloadHash}. The chain link. */
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  length: number;
  /** Index of the first broken link, if any. */
  brokenAt?: number;
  /** Machine-readable reason code, if invalid. */
  reason?:
    | "OK"
    | "EMPTY"
    | "BAD_GENESIS"
    | "PAYLOAD_TAMPERED"
    | "HASH_TAMPERED"
    | "BROKEN_LINK"
    | "BAD_INDEX";
  detail?: string;
}

// ---------------------------------------------------------------------------
// Corroboration engine
// ---------------------------------------------------------------------------

export type LossType =
  | "flood"
  | "waterlogging"
  | "flash_flood"
  | "heatwave"
  | "drought"
  | "hail";

export type GrowthStage = "sowing" | "vegetative" | "flowering" | "maturity";

/** Sentinel-2 NDVI before/after the event. */
export interface NdviSignal {
  before: number; // 0..1
  after: number; // 0..1
  captureBefore: string; // ISO date of the pre-event scene
  captureAfter: string; // ISO date of the post-event scene
  source: "sentinel-2-seed" | "sentinel-2-live";
}

/**
 * A weather anomaly measured against a 10-year same-calendar-window baseline.
 * `kind` selects which physical quantity drives corroboration for the loss
 * type (rainfall for floods/drought, temperature for heatwaves).
 */
export interface WeatherSignal {
  kind: "rainfall" | "temperature";
  /** Observed value over the event window (mm total, or °C mean max). */
  observed: number;
  baselineMean: number;
  baselineStd: number;
  windowStart: string;
  windowEnd: string;
  source: "open-meteo-seed" | "open-meteo-live";
}

export interface TimingSignal {
  /** When the loss physically occurred (ISO 8601). */
  eventAt: string;
  /** When the farmer sealed the receipt (ISO 8601). */
  reportedAt: string;
}

export interface CorroborationInput {
  lossType: LossType;
  growthStage: GrowthStage;
  ndvi: NdviSignal;
  weather: WeatherSignal;
  timing: TimingSignal;
}

export interface CorroborationReason {
  code: string;
  label: string;
  signal: "ndvi" | "weather" | "timing" | "consistency";
  points: number;
  maxPoints: number;
  /** Raw numbers behind the reason, so the proof is auditable & legible. */
  detail: Record<string, number | string>;
}

export type Verdict =
  | "strongly_corroborated"
  | "corroborated"
  | "weak"
  | "uncorroborated";

export interface CorroborationReport {
  /** 0..100 integer. */
  score: number;
  verdict: Verdict;
  reasons: CorroborationReason[];
  components: {
    ndvi: number;
    weather: number;
    timing: number;
    consistency: number;
  };
  computedAt: string;
  engineVersion: string;
}
