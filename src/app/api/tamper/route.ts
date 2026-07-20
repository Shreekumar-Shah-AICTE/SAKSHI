import { NextResponse } from "next/server";
import { getStore } from "@/data/store";
import { verifyChain, hashPayload, computeReceiptHash } from "@/core/hashchain";
import type { EvidenceReceipt } from "@/core/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tamper  { index, newLossType, refix }
 *
 * A live, in-browser demonstration of tamper-evidence. We take a COPY of the
 * sealed chain, rewrite one receipt's loss type, optionally "re-fix" that
 * receipt's own hashes (the sophisticated-attacker move), then run the exact
 * same verifyChain() the QR verifier uses. The real chain is never mutated.
 */
export async function POST(req: Request) {
  let index = 0;
  let newLossType = "drought";
  let refix = false;
  try {
    const body = (await req.json()) as { index?: number; newLossType?: string; refix?: boolean };
    if (typeof body.index === "number") index = body.index;
    if (typeof body.newLossType === "string") newLossType = body.newLossType;
    refix = Boolean(body.refix);
  } catch {
    /* use defaults */
  }

  const store = getStore();
  // Deep copy so we never touch the real ledger.
  const chain: EvidenceReceipt[] = JSON.parse(JSON.stringify(store.getChain()));
  if (chain.length === 0) {
    return NextResponse.json({ error: "empty chain" }, { status: 400 });
  }
  const i = Math.max(0, Math.min(chain.length - 1, index));

  const before = verifyChain(chain);

  // Tamper: rewrite the loss type on receipt #i.
  const original = chain[i].payload.lossType;
  chain[i].payload.lossType = newLossType;

  if (refix) {
    // Attacker recomputes THIS receipt's hashes so it looks internally consistent.
    chain[i].payloadHash = hashPayload(chain[i].payload);
    chain[i].hash = computeReceiptHash(
      chain[i].index,
      chain[i].timestamp,
      chain[i].prevHash,
      chain[i].payloadHash,
    );
  }

  const after = verifyChain(chain);

  return NextResponse.json({
    index: i,
    original,
    newLossType,
    refix,
    before: { valid: before.valid, reason: before.reason },
    after: {
      valid: after.valid,
      reason: after.reason,
      brokenAt: after.brokenAt,
      detail: after.detail,
    },
  });
}
