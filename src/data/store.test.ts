import { describe, it, expect } from "vitest";
import { getStore } from "./store";
import { verifyChain } from "@/core/hashchain";
import { FLAGSHIP_EVENT_ID } from "./seed/churu-events";

describe("in-memory ledger store", () => {
  it("seeds a valid, non-empty hash-chain deterministically", () => {
    const store = getStore();
    const v = store.verify();
    expect(v.valid).toBe(true);
    expect(v.length).toBe(5);
  });

  it("verifies with the pure core verifier too", () => {
    const store = getStore();
    expect(verifyChain(store.getChain()).valid).toBe(true);
  });

  it("seals the flagship to 94 and is idempotent (same hash every time)", () => {
    const store = getStore();
    const a = store.sealLoss(FLAGSHIP_EVENT_ID)!;
    const b = store.sealLoss(FLAGSHIP_EVENT_ID)!;
    expect(a.report?.score).toBe(94);
    expect(a.receipt?.hash).toBe(b.receipt?.hash);
  });

  it("keeps the chain valid after (idempotent) re-seals", () => {
    const store = getStore();
    store.sealLoss(FLAGSHIP_EVENT_ID);
    store.sealLoss("event-rajgarh-flashflood-2025");
    expect(store.verify().valid).toBe(true);
    expect(store.getChain().length).toBe(5);
  });

  it("resolves a receipt by hash for the QR verifier", () => {
    const store = getStore();
    const bundle = store.getBundle(FLAGSHIP_EVENT_ID)!;
    const hash = bundle.receipt!.hash;
    const res = store.getByReceiptHash(hash);
    expect(res.found).toBe(true);
    expect(res.chainValid).toBe(true);
    expect(res.bundle?.event.id).toBe(FLAGSHIP_EVENT_ID);
  });

  it("reports honest stats", () => {
    const store = getStore();
    const s = store.getStats();
    expect(s.receipts).toBe(5);
    expect(s.farmersProtected).toBe(5);
    expect(s.chainValid).toBe(true);
    expect(s.averageScore).toBeGreaterThan(60);
  });

  it("writes an append-only audit trail covering seal/corroborate/dossier", () => {
    const store = getStore();
    const actions = new Set(store.getAuditLog().map((a) => a.action));
    expect(actions.has("SEAL")).toBe(true);
    expect(actions.has("CORROBORATE")).toBe(true);
    expect(actions.has("DOSSIER")).toBe(true);
  });
});
