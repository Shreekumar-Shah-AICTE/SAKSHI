import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getStore } from "@/data/store";
import { shortHash, formatDateIST } from "@/lib/utils";
import { TamperDemo } from "@/components/TamperDemo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function LedgerPage() {
  const store = getStore();
  const chain = store.getChain();
  const verification = store.verify();
  const audit = store.getAuditLog();
  const stats = store.getStats();

  return (
    <main>
      <Nav />
      <div className="mx-auto max-w-4xl px-5 pb-24 pt-2">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-soil-100">The tamper-proof ledger</h1>
          <p className="mt-1 text-soil-300">
            An append-only hash-chain of every sealed loss. Each receipt embeds the previous
            receipt&apos;s hash, so nothing can be quietly rewritten to &ldquo;zero&rdquo;.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(stats.receipts)} label="receipts" />
          <Stat
            value={verification.valid ? "intact ✓" : "broken ✗"}
            label="chain integrity"
            tone={verification.valid ? "green" : "brown"}
          />
          <Stat value={String(stats.farmersProtected)} label="farmers" />
          <Stat value={`${stats.averageScore}`} label="avg corroboration" />
        </div>

        {/* Interactive tamper demonstration */}
        <TamperDemo />

        {/* The chain */}
        <h2 className="mb-3 mt-10 text-xl font-bold text-soil-100">Hash-chain</h2>
        <ol className="relative space-y-3 border-l border-white/10 pl-6">
          {chain.map((r) => (
            <li key={r.hash} className="relative">
              <span className="absolute -left-[31px] top-3 grid h-4 w-4 place-items-center rounded-full bg-seal text-[8px] text-night">
                {r.index}
              </span>
              <Link
                href={`/receipt/${r.hash}`}
                className="card block p-4 transition hover:border-seal/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="mono text-xs text-soil-100">
                    <span className="text-seal">hash</span> {shortHash(r.hash, 12, 8)}
                  </div>
                  <div className="text-xs text-soil-300">{formatDateIST(r.timestamp)}</div>
                </div>
                <div className="mono mt-1 text-[11px] text-soil-300">
                  ← prev {r.index === 0 ? "genesis" : shortHash(r.prevHash, 10, 6)}
                </div>
                <div className="mt-2 text-sm text-soil-100">
                  {r.payload.lossType.replace(/_/g, " ")} · field {r.payload.fieldId.replace("field-", "")}
                </div>
              </Link>
            </li>
          ))}
        </ol>

        {/* Audit log */}
        <h2 className="mb-3 mt-10 text-xl font-bold text-soil-100">Append-only audit log</h2>
        <div className="card divide-y divide-white/5 overflow-hidden">
          {audit.map((a) => (
            <div key={a.seq} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className="mono w-8 shrink-0 text-xs text-soil-300">{a.seq}</span>
              <span
                className={`chip shrink-0 ${
                  a.action === "SEAL" ? "!text-seal" : a.action === "VERIFY" ? "!text-verify" : ""
                }`}
              >
                {a.action}
              </span>
              <span className="text-soil-300">{a.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "green" | "brown" }) {
  const color = tone === "green" ? "text-ndvi-green" : tone === "brown" ? "text-ndvi-brown" : "text-seal";
  return (
    <div className="card p-4 text-center">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="label-muted mt-1">{label}</div>
    </div>
  );
}
