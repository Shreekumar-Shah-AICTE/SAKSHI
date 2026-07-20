import type { ReceiptView } from "@/lib/view";
import { CorroborationDial } from "./CorroborationDial";
import { SatelliteGrid } from "./SatelliteGrid";
import { HowVerified } from "./HowVerified";
import { ReceiptActions } from "./ReceiptActions";
import { formatDateIST, shortHash } from "@/lib/utils";

/**
 * The Loss Receipt — the Screenshot Moment. Loud with PROOF (SEALED, score,
 * satellite collapse, weather stamp, chained hash), quiet about the mechanism
 * (revealed only via HowVerified). Designed to be the frame a judge photographs.
 */
export function SealReceiptCard({
  view,
  qrDataUrl,
  verifyUrl,
}: {
  view: ReceiptView;
  qrDataUrl: string;
  verifyUrl: string;
}) {
  const primary = view.narration[0];

  return (
    <div className="mx-auto max-w-xl">
      <div className="card animate-seal-thunk overflow-hidden shadow-vault">
        {/* Sealed banner */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-seal/20 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-seal text-night shadow-seal">
              🔏
            </span>
            <div>
              <div className="text-lg font-black tracking-wide text-seal">✓ SEALED</div>
              <div className="label-muted">Loss Receipt · SAKSHI</div>
            </div>
          </div>
          <div className="text-right">
            <div className="label-muted">Receipt</div>
            <div className="mono text-sm text-soil-100">#{view.index}</div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="label-muted">Farmer</div>
            <div className="text-xl font-bold text-soil-100">{view.farmerName}</div>
            <div className="text-sm text-soil-300">
              {view.village}, {view.tehsil} · {view.district}, {view.state}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field k="Field" v={`Khasra ${view.khasra} · ${view.areaHa} ha`} />
              <Field k="Crop" v={view.crop} />
              <Field k="Loss" v={view.lossLabel} />
              <Field k="Stage" v={view.growthStage} />
              <Field
                k="Reported"
                v={`+${view.hoursToReport} h ${view.within72h ? "(within 72h)" : "(late)"}`}
              />
              <Field k="Geofence" v={view.geofenceInside ? "inside field ✓" : `${view.geofenceDistanceM} m outside`} />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <CorroborationDial score={view.score ?? 0} />
            <div className="mt-2 rounded-full bg-ndvi-green/15 px-3 py-1 text-xs font-semibold text-ndvi-green">
              {(view.verdict ?? "").replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* Proof strip: satellite + weather stamp */}
        <div className="grid gap-4 px-6 pb-2 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-2">
            <div className="w-16">
              <SatelliteGrid before={view.ndvi.sceneBefore} after={view.ndvi.sceneBefore} phase={0} />
            </div>
            <span className="text-xl text-ndvi-brown">▸</span>
            <div className="w-16">
              <SatelliteGrid before={view.ndvi.sceneAfter} after={view.ndvi.sceneAfter} phase={0} />
            </div>
          </div>
          <div className="text-right sm:text-left">
            <div className="text-2xl font-black text-seal">{view.weather.stamp}</div>
            <div className="text-xs text-soil-300">
              Sentinel-2 NDVI {view.ndvi.before.toFixed(2)} → {view.ndvi.after.toFixed(2)} ·
              −{view.ndvi.dropPct}%
            </div>
          </div>
        </div>

        {/* Narration */}
        <div className="mx-6 my-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="label-muted mb-1">In the farmer&apos;s own voice</div>
          <div className="text-lg text-soil-100">&ldquo;{primary.spoken}&rdquo;</div>
          <div className="text-xs text-soil-300">
            {primary.translit} — {primary.english}
          </div>
        </div>

        {/* Hash line */}
        <div className="mx-6 mb-4 rounded-2xl bg-night-600/60 px-4 py-3">
          <div className="mono text-xs leading-relaxed text-soil-100">
            <span className="text-seal">sha256</span>:{view.receiptHash ? shortHash(view.receiptHash, 14, 8) : "—"}
            <span className="text-soil-300"> · chained to </span>
            {view.index === 0 ? "genesis" : `#${(view.index ?? 1) - 1}`}
            <span className="text-soil-300"> · immutable</span>
          </div>
          <div className="mt-1 text-xs text-soil-300">Sealed {view.timestamp ? formatDateIST(view.timestamp) : "—"}</div>
        </div>

        {/* QR + the promise */}
        <div className="flex items-center gap-4 border-t border-white/10 px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Scan to verify this receipt" width={96} height={96} className="rounded-xl" />
          <div>
            <div className="font-semibold text-soil-100">Scan to verify — trust no one, verify the math.</div>
            <div className="text-sm text-seal">This claim can never be marked &ldquo;zero&rdquo; again.</div>
          </div>
        </div>
      </div>

      {/* Progressive disclosure of the real mechanism */}
      <HowVerified view={view} />

      <div className="mt-5">
        <ReceiptActions verifyUrl={verifyUrl} />
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="label-muted">{k}</div>
      <div className="text-soil-100">{v}</div>
    </div>
  );
}
