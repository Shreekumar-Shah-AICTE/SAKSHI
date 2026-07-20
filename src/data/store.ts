import {
  sealReceipt,
  sha256Hex,
  verifyChain,
  verifyReceiptByHash,
  type SealInput,
} from "@/core/hashchain";
import { corroborate } from "@/core/corroboration";
import { geofence, polygonAreaHa } from "@/core/geofence";
import type {
  ChainVerification,
  CorroborationReport,
  EvidenceReceipt,
} from "@/core/types";
import {
  EVENTS,
  FIELDS,
  FARMERS,
  getEvent,
  getField,
  getFarmer,
  type SeedEvent,
  type SeedField,
  type SeedFarmer,
} from "./seed/churu-events";

/**
 * SAKSHI — in-memory ledger store (the fail-closed default).
 *
 * This implements the same interface a Supabase-backed store would (see
 * supabase/schema.sql for the 7-table design). With no Supabase env vars set,
 * the deployed demo runs entirely on this deterministic seed store, so the
 * golden path works on "airplane mode" with zero secrets.
 *
 * The seals are deterministic: the same seed data always produces the same
 * hash-chain, so QR verification links remain valid across serverless cold
 * starts and across every deployment.
 */

export interface ClaimDossier {
  eventId: string;
  receiptHash: string;
  score: number;
  verdict: string;
  /** Short, appeal-ready summary lines (English base; UI localises). */
  summary: string[];
  builtAt: string;
}

export interface AuditEntry {
  seq: number;
  ts: string;
  action: "SEAL" | "CORROBORATE" | "DOSSIER" | "VERIFY";
  actor: string;
  eventId?: string;
  receiptHash?: string;
  detail: string;
}

export interface EventBundle {
  event: SeedEvent;
  farmer: SeedFarmer;
  field: SeedField;
  sealed: boolean;
  receipt: EvidenceReceipt | null;
  report: CorroborationReport | null;
  dossier: ClaimDossier | null;
}

export interface LedgerStats {
  receipts: number;
  chainValid: boolean;
  farmersProtected: number;
  hectaresProtected: number;
  averageScore: number;
}

function buildSealInput(event: SeedEvent, field: SeedField): SealInput {
  const geo = geofence(event.capture.gps, field.polygon);
  return {
    eventId: event.id,
    fieldId: field.id,
    farmerId: event.farmerId,
    capturedAt: event.capture.capturedAt,
    gps: event.capture.gps,
    geofence: geo,
    mediaSha256: sha256Hex(`SAKSHI-media::${event.id}`),
    lossType: event.lossType,
    narrationLang: event.narration[0]?.lang ?? "en",
    narrationText: event.narration[0]?.spoken,
    attestation: {
      platform: "sakshi-pwa",
      locationSource: "gps",
      liveCapture: true,
    },
  };
}

function buildDossier(
  event: SeedEvent,
  field: SeedField,
  farmer: SeedFarmer,
  receipt: EvidenceReceipt,
  report: CorroborationReport,
): ClaimDossier {
  const summary = [
    `${farmer.name}, ${field.khasra ? "Khasra " + field.khasra + ", " : ""}${farmer.village}, ${farmer.tehsil} (${farmer.district}, ${farmer.state}).`,
    `${field.cropLabel} on ${field.areaHa} ha — ${event.lossLabel} at ${event.growthStage}.`,
    `Corroboration ${report.score}/100 (${report.verdict.replace(/_/g, " ")}).`,
    ...report.reasons
      .filter((r) => r.points > 0 || r.code.includes("WITHIN"))
      .map((r) => `• ${r.label}.`),
    `Sealed as tamper-evident receipt ${receipt.hash.slice(0, 12)}…, chained to receipt #${receipt.index}.`,
  ];
  return {
    eventId: event.id,
    receiptHash: receipt.hash,
    score: report.score,
    verdict: report.verdict,
    summary,
    builtAt: receipt.timestamp,
  };
}

class InMemorySakshiStore {
  private chain: EvidenceReceipt[] = [];
  private reports = new Map<string, CorroborationReport>();
  private dossiers = new Map<string, ClaimDossier>();
  private receiptByEvent = new Map<string, string>(); // eventId -> receipt hash
  private audit: AuditEntry[] = [];
  private auditSeq = 0;

  constructor() {
    this.seed();
  }

  private log(entry: Omit<AuditEntry, "seq">) {
    this.audit.push({ seq: this.auditSeq++, ...entry });
  }

  private seed() {
    // Seal all five genuine events in chronological order of reporting, so the
    // ledger is alive and every QR link resolves — deterministically.
    const ordered = [...EVENTS].sort(
      (a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime(),
    );
    for (const event of ordered) {
      const field = getField(event.fieldId)!;
      this.sealInternal(event, field, event.reportedAt, "seed");
    }
  }

  private sealInternal(
    event: SeedEvent,
    field: SeedField,
    sealedAt: string,
    actor: string,
  ): EventBundle {
    const existingHash = this.receiptByEvent.get(event.id);
    if (existingHash) return this.getBundle(event.id)!;

    const input = buildSealInput(event, field);
    const receipt = sealReceipt(this.chain, input, sealedAt);
    this.chain.push(receipt);
    this.receiptByEvent.set(event.id, receipt.hash);
    this.log({
      ts: sealedAt,
      action: "SEAL",
      actor,
      eventId: event.id,
      receiptHash: receipt.hash,
      detail: `Sealed receipt #${receipt.index} (prev ${receipt.prevHash.slice(0, 8)}…).`,
    });

    const report = corroborate(
      {
        lossType: event.lossType,
        growthStage: event.growthStage,
        ndvi: event.ndvi,
        weather: event.weather,
        timing: { eventAt: event.eventAt, reportedAt: event.reportedAt },
      },
      sealedAt,
    );
    this.reports.set(event.id, report);
    this.log({
      ts: sealedAt,
      action: "CORROBORATE",
      actor,
      eventId: event.id,
      detail: `Corroboration ${report.score}/100 (${report.verdict}).`,
    });

    const farmer = getFarmer(event.farmerId)!;
    const dossier = buildDossier(event, field, farmer, receipt, report);
    this.dossiers.set(event.id, dossier);
    this.log({
      ts: sealedAt,
      action: "DOSSIER",
      actor,
      eventId: event.id,
      receiptHash: receipt.hash,
      detail: `Built appeal-ready loss dossier.`,
    });

    return this.getBundle(event.id)!;
  }

  /** Idempotent live seal used by the demo golden path. Recomputes the proof. */
  sealLoss(eventId: string): EventBundle | undefined {
    const event = getEvent(eventId);
    if (!event) return undefined;
    const field = getField(event.fieldId)!;
    // Deterministic seal time keeps the chain hashes stable across instances.
    return this.sealInternal(event, field, event.reportedAt, "farmer");
  }

  getBundle(eventId: string): EventBundle | undefined {
    const event = getEvent(eventId);
    if (!event) return undefined;
    const field = getField(event.fieldId)!;
    const farmer = getFarmer(event.farmerId)!;
    const hash = this.receiptByEvent.get(eventId);
    const receipt = hash ? this.chain.find((r) => r.hash === hash) ?? null : null;
    return {
      event,
      field,
      farmer,
      sealed: Boolean(receipt),
      receipt,
      report: this.reports.get(eventId) ?? null,
      dossier: this.dossiers.get(eventId) ?? null,
    };
  }

  listBundles(): EventBundle[] {
    return EVENTS.map((e) => this.getBundle(e.id)!);
  }

  getChain(): EvidenceReceipt[] {
    return [...this.chain];
  }

  verify(): ChainVerification {
    return verifyChain(this.chain);
  }

  getByReceiptHash(hash: string) {
    const result = verifyReceiptByHash(this.chain, hash);
    const eventId = result.receipt?.payload.eventId;
    this.log({
      ts: new Date().toISOString(),
      action: "VERIFY",
      actor: "verifier",
      eventId,
      receiptHash: hash,
      detail: result.found
        ? `Verification requested; chain ${result.chainValid ? "intact" : "broken"}.`
        : `Verification requested for unknown hash.`,
    });
    const bundle = eventId ? this.getBundle(eventId) : undefined;
    return { ...result, bundle };
  }

  getAuditLog(): AuditEntry[] {
    return [...this.audit].sort((a, b) => a.seq - b.seq);
  }

  getStats(): LedgerStats {
    const bundles = this.listBundles().filter((b) => b.sealed);
    const farmers = new Set(bundles.map((b) => b.farmer.id));
    const hectares = FIELDS.reduce((sum, f) => sum + polygonAreaHa(f.polygon), 0);
    const scores = bundles.map((b) => b.report?.score ?? 0);
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    return {
      receipts: this.chain.length,
      chainValid: this.verify().valid,
      farmersProtected: farmers.size,
      hectaresProtected: Math.round(hectares * 10) / 10,
      averageScore: avg,
    };
  }
}

// Module-level singleton. On serverless this lives for the life of the warm
// instance; because seeding is deterministic, every instance is identical.
declare global {
  // eslint-disable-next-line no-var
  var __sakshiStore: InMemorySakshiStore | undefined;
}

export function getStore(): InMemorySakshiStore {
  if (!globalThis.__sakshiStore) {
    globalThis.__sakshiStore = new InMemorySakshiStore();
  }
  return globalThis.__sakshiStore;
}

export type { SeedEvent, SeedField, SeedFarmer };
export { EVENTS, FIELDS, FARMERS };
