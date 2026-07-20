import { NextResponse } from "next/server";
import { getStore } from "@/data/store";
import { ENGINE_VERSION } from "@/core/corroboration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /health — deploy/liveness check.
 *
 * Confirms the deterministic Gravity Core booted, the seed chain sealed, and
 * the hash-chain verifies — i.e. the keyless demo is ready with zero secrets.
 */
export async function GET() {
  const store = getStore();
  const stats = store.getStats();
  const verification = store.verify();
  const healthy = verification.valid && stats.receipts > 0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "sakshi",
      engine: ENGINE_VERSION,
      chain: {
        length: verification.length,
        valid: verification.valid,
      },
      receipts: stats.receipts,
      farmersProtected: stats.farmersProtected,
      keylessDemo: true,
      liveSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      liveBhashini: Boolean(process.env.BHASHINI_API_KEY),
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
