import { describe, it, expect } from "vitest";
import {
  GENESIS_HASH,
  canonicalize,
  sha256Hex,
  hashPayload,
  sealReceipt,
  verifyChain,
  verifyReceiptByHash,
  type SealInput,
} from "./hashchain";
import type { EvidenceReceipt } from "./types";

function makeInput(eventId: string): SealInput {
  return {
    eventId,
    fieldId: "field-1",
    farmerId: "farmer-1",
    capturedAt: "2025-08-26T12:29:41+05:30",
    gps: { lat: 28.2961, lng: 74.9662, accuracyM: 6 },
    geofence: { polygonId: "field-1", inside: true, distanceM: 0 },
    mediaSha256: sha256Hex(`media::${eventId}`),
    lossType: "flood",
    narrationLang: "mwr",
    narrationText: "test",
  };
}

function buildChain(n: number): EvidenceReceipt[] {
  const chain: EvidenceReceipt[] = [];
  for (let i = 0; i < n; i++) {
    const t = `2025-08-2${i}T00:00:00Z`;
    chain.push(sealReceipt(chain, makeInput(`e${i}`), t));
  }
  return chain;
}

describe("canonicalize", () => {
  it("is stable regardless of key insertion order", () => {
    const a = canonicalize({ b: 1, a: 2, c: { z: 1, y: 2 } });
    const b = canonicalize({ c: { y: 2, z: 1 }, a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it("drops undefined values so optional fields do not change the hash", () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }));
  });

  it("distinguishes different values", () => {
    expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: 2 }));
  });
});

describe("sha256Hex", () => {
  it("matches the known SHA-256 of the empty string", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
  it("matches the known SHA-256 of 'abc'", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("sealReceipt", () => {
  it("links the first receipt to the genesis root", () => {
    const chain = buildChain(1);
    expect(chain[0].index).toBe(0);
    expect(chain[0].prevHash).toBe(GENESIS_HASH);
    expect(chain[0].hash).toHaveLength(64);
  });

  it("embeds the previous receipt's hash in each subsequent receipt", () => {
    const chain = buildChain(4);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].prevHash).toBe(chain[i - 1].hash);
      expect(chain[i].index).toBe(i);
    }
  });

  it("does not mutate the input chain", () => {
    const chain = buildChain(2);
    const snapshot = JSON.stringify(chain);
    sealReceipt(chain, makeInput("e-new"), "2025-08-30T00:00:00Z");
    expect(JSON.stringify(chain)).toBe(snapshot);
  });

  it("is deterministic — same inputs produce the same hash", () => {
    const a = sealReceipt([], makeInput("x"), "2025-08-26T00:00:00Z");
    const b = sealReceipt([], makeInput("x"), "2025-08-26T00:00:00Z");
    expect(a.hash).toBe(b.hash);
    expect(a.payloadHash).toBe(b.payloadHash);
  });
});

describe("verifyChain — happy path", () => {
  it("accepts an intact chain", () => {
    const v = verifyChain(buildChain(5));
    expect(v.valid).toBe(true);
    expect(v.reason).toBe("OK");
    expect(v.length).toBe(5);
  });

  it("rejects an empty chain", () => {
    expect(verifyChain([]).reason).toBe("EMPTY");
  });
});

describe("verifyChain — tamper detection (the whole point)", () => {
  it("detects a payload edit after sealing", () => {
    const chain = buildChain(4);
    // Attacker rewrites the loss type on receipt #2 but leaves the hashes.
    chain[2] = { ...chain[2], payload: { ...chain[2].payload, lossType: "drought" } };
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("PAYLOAD_TAMPERED");
    expect(v.brokenAt).toBe(2);
  });

  it("detects a forged receipt hash", () => {
    const chain = buildChain(4);
    chain[1] = { ...chain[1], hash: "f".repeat(64) };
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
    // The forged hash first surfaces as a broken back-link at the next receipt.
    expect(["HASH_TAMPERED", "BROKEN_LINK"]).toContain(v.reason);
  });

  it("detects a deleted (dropped) receipt", () => {
    const chain = buildChain(5);
    chain.splice(2, 1); // remove receipt #2; indices now inconsistent
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
    expect(v.brokenAt).toBe(2);
  });

  it("detects reordered receipts", () => {
    const chain = buildChain(4);
    const swapped = [chain[0], chain[2], chain[1], chain[3]];
    const v = verifyChain(swapped);
    expect(v.valid).toBe(false);
  });

  it("detects a spliced-in fabricated receipt", () => {
    const chain = buildChain(3);
    const forged = sealReceipt(chain.slice(0, 1), makeInput("forged"), "2025-08-05T00:00:00Z");
    chain.splice(1, 0, { ...forged, index: 1 });
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
  });

  it("detects a broken genesis link", () => {
    const chain = buildChain(2);
    chain[0] = { ...chain[0], prevHash: "1".repeat(64) };
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("BAD_GENESIS");
  });

  it("re-hashing a tampered payload to 'fix' it still breaks the back-link", () => {
    const chain = buildChain(4);
    // Sophisticated attacker edits payload AND recomputes that receipt's hashes.
    const edited = { ...chain[2].payload, lossType: "drought" };
    const payloadHash = hashPayload(edited);
    const hash = sha256Hex(
      canonicalize({
        index: chain[2].index,
        timestamp: chain[2].timestamp,
        prevHash: chain[2].prevHash,
        payloadHash,
      }),
    );
    chain[2] = { ...chain[2], payload: edited, payloadHash, hash };
    // Receipt #2 is now internally consistent, but #3 still embeds the OLD hash.
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("BROKEN_LINK");
    expect(v.brokenAt).toBe(3);
  });
});

describe("verifyReceiptByHash (QR verifier)", () => {
  it("finds a valid receipt and reports the chain intact", () => {
    const chain = buildChain(4);
    const target = chain[2];
    const res = verifyReceiptByHash(chain, target.hash);
    expect(res.found).toBe(true);
    expect(res.chainValid).toBe(true);
    expect(res.receipt?.hash).toBe(target.hash);
  });

  it("reports not-found for an unknown hash", () => {
    const chain = buildChain(3);
    const res = verifyReceiptByHash(chain, "a".repeat(64));
    expect(res.found).toBe(false);
  });
});
