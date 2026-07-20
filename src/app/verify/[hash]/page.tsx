import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getStore } from "@/data/store";
import { buildReceiptView } from "@/lib/view";
import { formatDateIST, shortHash } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public QR verifier. Anyone — an ombudsman, a DGRC officer, a judge in the
 * room — can scan the receipt and independently confirm it is authentic and the
 * append-only chain is intact. Trust no one; verify the math.
 */
export default function VerifyPage({ params }: { params: { hash: string } }) {
  const store = getStore();
  const result = store.getByReceiptHash(params.hash);
  const ok = result.found && result.chainValid;
  const view = result.bundle ? buildReceiptView(result.bundle) : null;

  return (
    <main>
      <Nav />
      <div className="mx-auto max-w-lg px-5 pb-20 pt-4">
        <div
          className={`card overflow-hidden ${ok ? "shadow-seal" : "border-ndvi-brown/40"}`}
        >
          <div
            className={`px-6 py-8 text-center ${
              ok ? "bg-gradient-to-b from-ndvi-green/20 to-transparent" : "bg-gradient-to-b from-ndvi-brown/20 to-transparent"
            }`}
          >
            <div className="text-6xl">{ok ? "✓" : result.found ? "⚠️" : "✗"}</div>
            <h1 className={`mt-2 text-3xl font-black ${ok ? "text-ndvi-green" : "text-ndvi-brown"}`}>
              {ok ? "VERIFIED" : result.found ? "CHAIN BROKEN" : "NOT FOUND"}
            </h1>
            <p className="mt-1 text-sm text-soil-300">
              {ok
                ? "This Loss Receipt is authentic and the tamper-proof chain is intact."
                : result.found
                  ? "This receipt exists but the surrounding chain fails verification."
                  : "No receipt with this hash exists in the SAKSHI ledger."}
            </p>
          </div>

          {view && (
            <div className="border-t border-white/10 p-6">
              <div className="grid gap-2 text-sm">
                <Row k="Farmer" v={`${view.farmerName} · ${view.village}, ${view.tehsil}`} />
                <Row k="Field" v={`Khasra ${view.khasra} · ${view.crop} · ${view.areaHa} ha`} />
                <Row k="Loss" v={`${view.lossLabel} — corroboration ${view.score}/100`} />
                <Row k="Sealed" v={view.timestamp ? formatDateIST(view.timestamp) : "—"} />
                <Row k="Receipt" v={`#${view.index} · ${shortHash(view.receiptHash ?? "")}`} mono />
                <Row
                  k="Chained to"
                  v={view.index === 0 ? "genesis root" : shortHash(view.prevHash ?? "")}
                  mono
                />
              </div>

              <div className="mt-5 rounded-2xl bg-night-600/60 p-4 text-center">
                <div className="label-muted">Independent corroboration</div>
                <div className="mt-1 text-2xl font-black text-seal">{view.weather.stamp}</div>
                <div className="text-xs text-soil-300">
                  Sentinel-2 NDVI {view.ndvi.before.toFixed(2)} → {view.ndvi.after.toFixed(2)} · reported
                  within {view.hoursToReport}h
                </div>
              </div>

              <div className="mt-5 text-center">
                <Link href={`/receipt/${view.receiptHash}`} className="btn-ghost">
                  View full Loss Receipt
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-soil-300">
          Verification recomputes every hash in the chain from scratch — it cannot be spoofed by
          editing a stored value.
        </p>
      </div>
    </main>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-soil-300">{k}</span>
      <span className={mono ? "mono text-xs text-soil-100" : "text-soil-100"}>{v}</span>
    </div>
  );
}
