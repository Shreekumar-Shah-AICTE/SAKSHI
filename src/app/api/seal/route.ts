import { NextResponse } from "next/server";
import { getStore } from "@/data/store";
import { buildReceiptView } from "@/lib/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/seal  { eventId }
 *
 * The golden-path endpoint. It runs the REAL Gravity Core: geofence → SHA-256 →
 * append to the hash-chain → deterministic corroboration. Idempotent per event
 * (the seal is deterministic), so repeated demo runs return the identical
 * cryptographic receipt — reproducible proof, never a faked output.
 */
export async function POST(req: Request) {
  let eventId: string | undefined;
  try {
    const body = (await req.json()) as { eventId?: string };
    eventId = body.eventId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const store = getStore();
  const bundle = store.sealLoss(eventId);
  if (!bundle) {
    return NextResponse.json({ error: `Unknown event ${eventId}` }, { status: 404 });
  }

  const view = buildReceiptView(bundle);
  const chain = store.verify();
  return NextResponse.json({ view, chainValid: chain.valid, chainLength: chain.length });
}
