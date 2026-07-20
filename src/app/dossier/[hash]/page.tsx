import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStore } from "@/data/store";
import { buildReceiptView } from "@/lib/view";
import { resolveBaseUrl, verifyQrDataUrl } from "@/lib/qr";
import { formatDateIST, formatDayIST, shortHash } from "@/lib/utils";
import { PrintButton } from "@/components/PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /dossier/[hash] — the appeal-ready, multilingual Loss Dossier (Service 3).
 *
 * A light-themed, print-perfect document a farmer can hand to the DGRC, the
 * insurance ombudsman, or a court. "Save as PDF" (or the Print button) yields a
 * clean single-purpose PDF — QR-verifiable, with all three language narrations
 * and the full, auditable corroboration reasoning. This is the tangible
 * artifact that closes the loop from "sealed" to "redressal".
 */
export default async function DossierPage({ params }: { params: { hash: string } }) {
  const store = getStore();
  const result = store.getByReceiptHash(params.hash);
  if (!result.found || !result.bundle) notFound();

  const view = buildReceiptView(result.bundle);
  const baseUrl = resolveBaseUrl(headers().get("host"));
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify/${params.hash}`;
  const qr = await verifyQrDataUrl(baseUrl, params.hash);

  return (
    <div className="dossier-root">
      {/* Scoped light theme + print rules; independent of the app's dark shell. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .dossier-root{background:#eef1f4;min-height:100vh;padding:24px 16px;color:#12203a;
          font-family:ui-sans-serif,system-ui,"Noto Sans","Noto Sans Devanagari",Arial,sans-serif;}
        .sheet{max-width:820px;margin:0 auto;background:#fff;border:1px solid #d7dde5;border-radius:12px;
          box-shadow:0 20px 60px -30px rgba(0,0,0,.35);overflow:hidden;}
        .sheet-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
          padding:22px 28px;border-bottom:3px solid #0b1120;background:#f7f9fb;}
        .brand{display:flex;align-items:center;gap:10px;}
        .brand .mark{width:40px;height:40px;border-radius:9px;background:#0b1120;color:#f5a524;
          display:grid;place-items:center;font-weight:800;font-size:15px;}
        .brand h1{margin:0;font-size:18px;letter-spacing:.5px;}
        .brand p{margin:2px 0 0;font-size:11px;color:#5b6b82;text-transform:uppercase;letter-spacing:.14em;}
        .verdict-badge{text-align:right;}
        .verdict-badge .score{font-size:34px;font-weight:900;color:#127a33;line-height:1;}
        .verdict-badge .v{font-size:11px;color:#5b6b82;text-transform:uppercase;letter-spacing:.1em;}
        .sealbar{display:flex;align-items:center;gap:8px;background:#fff7e6;border:1px solid #f3d18a;
          color:#8a5a00;font-weight:800;padding:8px 14px;border-radius:8px;font-size:13px;margin:16px 28px 0;}
        .body{padding:14px 28px 26px;}
        .row{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;margin:14px 0;}
        .kv .k{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#7688a0;}
        .kv .val{font-size:14px;font-weight:600;}
        h2.section{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#0b1120;
          border-bottom:1px solid #e3e8ee;padding-bottom:6px;margin:22px 0 10px;}
        .evi{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .evi .box{border:1px solid #e3e8ee;border-radius:9px;padding:12px 14px;background:#fbfcfe;}
        .evi .big{font-size:22px;font-weight:900;color:#b45309;}
        .evi .sub{font-size:12px;color:#5b6b82;margin-top:2px;}
        .reasons{list-style:none;padding:0;margin:0;}
        .reasons li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;
          border-bottom:1px dashed #e7ebf1;font-size:13px;}
        .reasons .tick{color:#127a33;font-weight:800;}
        .reasons .code{font-family:ui-monospace,monospace;font-size:10px;color:#8593a8;}
        .narr{border:1px solid #e3e8ee;border-radius:9px;padding:10px 14px;margin:8px 0;background:#fbfcfe;}
        .narr .lang{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#7688a0;}
        .narr .spoken{font-size:15px;font-weight:600;}
        .narr .gloss{font-size:12px;color:#5b6b82;}
        .hashbox{font-family:ui-monospace,monospace;font-size:11px;background:#0b1120;color:#e9dccb;
          border-radius:8px;padding:12px 14px;word-break:break-all;line-height:1.6;}
        .hashbox .lbl{color:#f5a524;}
        .verify{display:flex;gap:16px;align-items:center;border-top:1px solid #e3e8ee;
          margin-top:20px;padding-top:16px;}
        .verify img{width:104px;height:104px;border-radius:8px;border:1px solid #e3e8ee;}
        .foot{font-size:10.5px;color:#7688a0;padding:14px 28px;border-top:1px solid #e3e8ee;background:#f7f9fb;}
        .toolbar{max-width:820px;margin:0 auto 14px;display:flex;gap:10px;justify-content:flex-end;}
        .btn{appearance:none;border:1px solid #0b1120;background:#0b1120;color:#fff;font-weight:700;
          padding:10px 16px;border-radius:9px;font-size:13px;cursor:pointer;text-decoration:none;display:inline-block;}
        .btn.secondary{background:#fff;color:#0b1120;}
        @media print{
          .dossier-root{background:#fff;padding:0;}
          .toolbar{display:none !important;}
          .sheet{border:none;box-shadow:none;border-radius:0;max-width:none;}
          a[href]:after{content:"";}
        }
      `,
        }}
      />


      <div className="toolbar">
        <PrintButton />
        <a className="btn secondary" href={`/api/dossier/${params.hash}`}>
          ⬇ Machine-readable JSON
        </a>
        <a className="btn secondary" href={`/verify/${params.hash}`}>
          Open verifier
        </a>
      </div>

      <div className="sheet">
        <div className="sheet-head">
          <div className="brand">
            <span className="mark">सा</span>
            <div>
              <h1>SAKSHI · साक्षी — Loss Dossier</h1>
              <p>Tamper-evident · independently corroborated · appeal-ready</p>
            </div>
          </div>
          <div className="verdict-badge">
            <div className="score">{view.score}/100</div>
            <div className="v">{(view.verdict ?? "").replace(/_/g, " ")}</div>
          </div>
        </div>

        <div className="sealbar">🔏 ✓ SEALED — receipt #{view.index} · this evidence cannot be altered without detection</div>

        <div className="body">
          <div className="row">
            <div className="kv"><div className="k">Claimant</div><div className="val">{view.farmerName}</div></div>
            <div className="kv"><div className="k">Location</div><div className="val">{view.village}, {view.tehsil} · {view.district}, {view.state}</div></div>
            <div className="kv"><div className="k">Field</div><div className="val">Khasra {view.khasra} · {view.crop} · {view.areaHa} ha</div></div>
            <div className="kv"><div className="k">Loss</div><div className="val">{view.lossLabel} at {view.growthStage}</div></div>
            <div className="kv"><div className="k">Event occurred</div><div className="val">{formatDateIST(view.eventAt)}</div></div>
            <div className="kv"><div className="k">Reported (PMFBY window)</div><div className="val">+{view.hoursToReport}h — {view.within72h ? "within 72h ✓" : "outside 72h"}</div></div>
          </div>

          <h2 className="section">Independent corroboration — two sources no single party controls</h2>
          <div className="evi">
            <div className="box">
              <div className="k" style={{ fontSize: 10, color: "#7688a0", textTransform: "uppercase", letterSpacing: ".12em" }}>
                Source 1 · Sentinel-2 satellite
              </div>
              <div className="big">NDVI {view.ndvi.before.toFixed(2)} → {view.ndvi.after.toFixed(2)}</div>
              <div className="sub">−{view.ndvi.dropPct}% vegetation greenness over the registered field</div>
            </div>
            <div className="box">
              <div className="k" style={{ fontSize: 10, color: "#7688a0", textTransform: "uppercase", letterSpacing: ".12em" }}>
                Source 2 · Open-Meteo {view.weather.kind} {view.weather.live ? "(live)" : "(10-yr baseline)"}
              </div>
              <div className="big">{view.weather.stamp}</div>
              <div className="sub">
                {view.weather.observed}{view.weather.unit} vs {view.weather.baselineMean}{view.weather.unit} baseline ·
                Z = {view.weather.zScore}σ ({view.weather.windowStart} → {view.weather.windowEnd})
              </div>
            </div>
          </div>

          <h2 className="section">Auditable corroboration reasoning</h2>
          <ul className="reasons">
            {view.reasons.map((r, i) => (
              <li key={i}>
                <span>
                  <span className={r.points > 0 ? "tick" : ""}>{r.points > 0 ? "✓ " : "• "}</span>
                  {r.label} <span className="code">[{r.code}]</span>
                </span>
                {r.maxPoints > 0 && <span className="code">+{r.points}/{r.maxPoints}</span>}
              </li>
            ))}
          </ul>

          <h2 className="section">Claimant&apos;s statement (multilingual)</h2>
          {view.narration.map((n, i) => (
            <div className="narr" key={i}>
              <div className="lang">{n.lang}</div>
              <div className="spoken">“{n.spoken}”</div>
              <div className="gloss">{n.translit} — {n.english}</div>
            </div>
          ))}

          <h2 className="section">Cryptographic seal (append-only hash-chain)</h2>
          <div className="hashbox">
            <div><span className="lbl">media sha256</span> : {view.mediaSha256 ?? "—"}</div>
            <div><span className="lbl">payload hash</span> : {view.payloadHash ?? "—"}</div>
            <div><span className="lbl">receipt hash</span> : {view.receiptHash ?? "—"}</div>
            <div><span className="lbl">chained to</span>&nbsp;&nbsp; : {view.index === 0 ? "genesis root" : shortHash(view.prevHash ?? "", 24, 12)} (receipt #{view.index === 0 ? 0 : (view.index ?? 1) - 1})</div>
            <div><span className="lbl">sealed at</span>&nbsp;&nbsp;&nbsp; : {view.timestamp ? formatDateIST(view.timestamp) : "—"}</div>
          </div>

          <div className="verify">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Scan to verify this dossier" />
            <div>
              <div style={{ fontWeight: 700 }}>Verify independently — trust no one, verify the math.</div>
              <div style={{ fontSize: 12, color: "#5b6b82", marginTop: 2, overflowWrap: "anywhere" }}>
                Scan the code or visit <strong>{verifyUrl}</strong>. Verification recomputes every hash in the
                chain, so a forged or altered receipt is detected automatically.
              </div>
            </div>
          </div>
        </div>

        <div className="foot">
          Generated by SAKSHI on {formatDayIST(new Date().toISOString())}. Corroboration is deterministic and
          rule-based; this dossier supports — it does not replace — the decision of the DGRC, insurance ombudsman
          or court. Under PMFBY, crop-loss must be reported within 72 hours of the event.
        </div>
      </div>
    </div>
  );
}
