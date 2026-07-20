import { createHash } from "node:crypto";
import type {
  ChainVerification,
  DeviceAttestation,
  EvidenceReceipt,
  GeofenceResult,
  GpsFix,
  ReceiptPayload,
} from "./types";

/**
 * SAKSHI — tamper-evident evidence pipeline (append-only hash-chain).
 *
 * This is gravity component #1. It contains NO AI and NO network calls. Its job
 * is to make a farmer's evidence *unerasable*: every receipt embeds the hash of
 * the previous receipt, so editing, inserting, deleting or reordering any
 * receipt breaks the chain and is mathematically detectable.
 */

/** The genesis root that precedes the first receipt. 64 zero-nibbles. */
export const GENESIS_HASH = "0".repeat(64);

/**
 * Deterministic ("canonical") JSON serialization: object keys are emitted in
 * sorted order at every depth, with no incidental whitespace. Two payloads that
 * are semantically equal always produce byte-identical strings, so their hashes
 * match regardless of how the object was constructed.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys
    // Drop undefined values so optional fields don't change the hash by presence.
    .filter((k) => obj[k] !== undefined)
    .map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]));
  return "{" + parts.join(",") + "}";
}

/** SHA-256 of a string or buffer, as lowercase hex. */
export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Hash of a receipt payload (canonical form). */
export function hashPayload(payload: ReceiptPayload): string {
  return sha256Hex(canonicalize(payload));
}

/**
 * The chain-link hash. Binds position + time + previous link + payload hash, so
 * a receipt cannot be moved, re-timed or re-parented without detection.
 */
export function computeReceiptHash(
  index: number,
  timestamp: string,
  prevHash: string,
  payloadHash: string,
): string {
  return sha256Hex(
    canonicalize({ index, timestamp, prevHash, payloadHash }),
  );
}

export interface SealInput {
  eventId: string;
  fieldId: string;
  farmerId: string;
  capturedAt: string;
  gps: GpsFix;
  geofence: GeofenceResult;
  mediaSha256: string;
  lossType: string;
  narrationLang: string;
  narrationText?: string;
  attestation?: DeviceAttestation;
}

/**
 * Seal a new piece of evidence onto the end of a chain. Pure function: it does
 * not mutate `chain`; it returns the new receipt to append. The previous hash
 * is taken from the last receipt (or the genesis root for an empty chain).
 */
export function sealReceipt(
  chain: readonly EvidenceReceipt[],
  input: SealInput,
  sealedAt: string,
): EvidenceReceipt {
  const index = chain.length;
  const prevHash = chain.length === 0 ? GENESIS_HASH : chain[chain.length - 1].hash;

  const payload: ReceiptPayload = {
    eventId: input.eventId,
    fieldId: input.fieldId,
    farmerId: input.farmerId,
    capturedAt: input.capturedAt,
    gps: input.gps,
    geofence: input.geofence,
    mediaSha256: input.mediaSha256,
    lossType: input.lossType,
    narrationLang: input.narrationLang,
    narrationText: input.narrationText,
    attestation: input.attestation,
  };

  const payloadHash = hashPayload(payload);
  const hash = computeReceiptHash(index, sealedAt, prevHash, payloadHash);

  return { index, timestamp: sealedAt, prevHash, payload, payloadHash, hash };
}

/**
 * Verify the integrity of an entire chain. Returns the first broken link, if
 * any, with a machine-readable reason. This is the deterministic tamper check:
 * it recomputes every payload hash and every link hash from scratch and checks
 * the back-links, so it cannot be fooled by a receipt whose stored hash was
 * edited to look consistent.
 */
export function verifyChain(chain: readonly EvidenceReceipt[]): ChainVerification {
  if (chain.length === 0) {
    return { valid: false, length: 0, reason: "EMPTY", detail: "Chain is empty." };
  }

  let expectedPrev = GENESIS_HASH;

  for (let i = 0; i < chain.length; i++) {
    const r = chain[i];

    if (r.index !== i) {
      return {
        valid: false,
        length: chain.length,
        brokenAt: i,
        reason: "BAD_INDEX",
        detail: `Receipt at position ${i} claims index ${r.index}.`,
      };
    }

    if (r.prevHash !== expectedPrev) {
      return {
        valid: false,
        length: chain.length,
        brokenAt: i,
        reason: i === 0 ? "BAD_GENESIS" : "BROKEN_LINK",
        detail:
          i === 0
            ? "First receipt does not point at the genesis root."
            : `Receipt #${i} does not embed the previous receipt's hash.`,
      };
    }

    const recomputedPayloadHash = hashPayload(r.payload);
    if (recomputedPayloadHash !== r.payloadHash) {
      return {
        valid: false,
        length: chain.length,
        brokenAt: i,
        reason: "PAYLOAD_TAMPERED",
        detail: `Receipt #${i} payload has been altered after sealing.`,
      };
    }

    const recomputedHash = computeReceiptHash(
      r.index,
      r.timestamp,
      r.prevHash,
      r.payloadHash,
    );
    if (recomputedHash !== r.hash) {
      return {
        valid: false,
        length: chain.length,
        brokenAt: i,
        reason: "HASH_TAMPERED",
        detail: `Receipt #${i} hash does not match its contents.`,
      };
    }

    expectedPrev = r.hash;
  }

  return { valid: true, length: chain.length, reason: "OK" };
}

/**
 * Verify a single receipt in the context of its chain (used by the QR
 * verifier). Confirms the whole chain is intact AND that the target receipt is
 * present with the expected hash.
 */
export function verifyReceiptByHash(
  chain: readonly EvidenceReceipt[],
  hash: string,
): {
  found: boolean;
  chainValid: boolean;
  receipt?: EvidenceReceipt;
  verification: ChainVerification;
} {
  const verification = verifyChain(chain);
  const receipt = chain.find((r) => r.hash === hash);
  return {
    found: Boolean(receipt),
    chainValid: verification.valid,
    receipt,
    verification,
  };
}
