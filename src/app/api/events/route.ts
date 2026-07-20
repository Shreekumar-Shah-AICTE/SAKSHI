import { NextResponse } from "next/server";
import { getStore } from "@/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/events — a light index of the seeded events for the chooser. */
export async function GET() {
  const store = getStore();
  const events = store.listBundles().map((b) => ({
    eventId: b.event.id,
    farmerName: b.farmer.name,
    village: b.farmer.village,
    tehsil: b.farmer.tehsil,
    crop: b.field.cropLabel,
    lossLabel: b.event.lossLabel,
    score: b.report?.score ?? null,
    sealed: b.sealed,
    receiptHash: b.receipt?.hash ?? null,
    langPref: b.farmer.langPref,
  }));
  return NextResponse.json({ events, stats: store.getStats() });
}
