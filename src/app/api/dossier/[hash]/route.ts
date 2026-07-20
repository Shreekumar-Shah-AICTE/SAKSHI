import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStore } from "@/data/store";
import { buildReceiptView } from "@/lib/view";
import { resolveBaseUrl } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dossier/[hash]
 *
 * The machine-readable, appeal-ready Loss Dossier — a self-contained JSON export
 * a DGRC / ombudsman / court system can ingest and independently re-verify,
 * WITHOUT trusting the farmer OR the insurer. Downloaded as an attachment.
 *
 * It bundles: the tamper-evident receipt (with its chain position + prev hash),
 * the full corroboration report with machine-readable reasons, both independent
 * evidence sources, every language narration, and the public verification URL.
 */
export async function GET(_req: Request, { params }: { params: { hash: string } }) {
  const store = getStore();
  const result = store.getByReceiptHash(params.hash);
  if (!result.found || !result.bundle) {
    return NextResponse.json({ error: "receipt not found" }, { status: 404 });
  }

  const view = buildReceiptView(result.bundle);
  const baseUrl = resolveBaseUrl(headers().get("host"));
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify/${params.hash}`;

  const dossier = {
    schema: "sakshi.loss-dossier/v1",
    issued_at: new Date().toISOString(),
    verification: {
      receipt_hash: view.receiptHash,
      chain_position: view.index,
      prev_hash: view.prevHash,
      chain_valid: result.chainValid,
      verify_url: verifyUrl,
      how_to_verify:
        "Recompute SHA-256 over the canonical payload and the link {index,timestamp,prevHash,payloadHash}; confirm it equals receipt_hash and that the next receipt embeds it.",
    },
    claimant: {
      name: view.farmerName,
      village: view.village,
      tehsil: view.tehsil,
      district: view.district,
      state: view.state,
    },
    field: { khasra: view.khasra, crop: view.crop, area_ha: view.areaHa },
    loss: {
      type: view.lossType,
      label: view.lossLabel,
      growth_stage: view.growthStage,
      event_at: view.eventAt,
      reported_at: view.reportedAt,
      hours_to_report: view.hoursToReport,
      within_pmfby_72h: view.within72h,
    },
    capture: {
      gps: view.gps,
      geofence_inside_field: view.geofenceInside,
      geofence_distance_m: view.geofenceDistanceM,
      media_sha256: view.mediaSha256,
    },
    corroboration: {
      score: view.score,
      verdict: view.verdict,
      components: view.components,
      reasons: view.reasons,
    },
    independent_evidence: {
      sentinel2_ndvi: {
        before: view.ndvi.before,
        after: view.ndvi.after,
        drop_pct: view.ndvi.dropPct,
      },
      weather: {
        kind: view.weather.kind,
        observed: view.weather.observed,
        baseline_mean: view.weather.baselineMean,
        baseline_std: view.weather.baselineStd,
        z_score: view.weather.zScore,
        anomaly_pct: view.weather.anomalyPct,
        window: `${view.weather.windowStart}..${view.weather.windowEnd}`,
        source: view.weather.live ? "open-meteo-live" : "open-meteo (10-yr baseline)",
      },
    },
    narration: view.narration,
    disclaimer:
      "Corroboration is deterministic and rule-based; the receipt proves the evidence was sealed and is tamper-evident. This dossier supports — it does not replace — the adjudicating authority's decision.",
  };

  return new NextResponse(JSON.stringify(dossier, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sakshi-dossier-${(view.receiptHash ?? "receipt").slice(0, 12)}.json"`,
    },
  });
}
