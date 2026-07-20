import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getStore } from "@/data/store";
import { FLAGSHIP_EVENT_ID } from "@/data/seed/churu-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  const store = getStore();
  const stats = store.getStats();
  const bundles = store.listBundles();

  return (
    <main>
      <Nav />

      {/* Hero — the gut punch */}
      <section className="mx-auto max-w-5xl px-5 pb-10 pt-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="chip mx-auto mb-6">
            AI for Bharat 2026 · AgriTech · Financial Inclusion · Regional-Language AI
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-seal">
            1.7 lakh farmers. One state. One year.
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-soil-100 sm:text-6xl">
            Their crop-loss claims were marked{" "}
            <span className="text-ndvi-brown line-through decoration-ndvi-brown/60">ZERO</span>.
            <br className="hidden sm:block" /> No surveyor ever came.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-soil-300">
            SAKSHI (<span className="text-soil-100">साक्षी — “witness”</span>) lets a farmer{" "}
            <span className="text-soil-100">seal</span> their loss in 10 seconds, in their own
            language — corroborated by two sources no one can bribe:{" "}
            <span className="text-ndvi-green">satellite</span> and{" "}
            <span className="text-verify">weather</span>. Before an insurer can mark it “zero”.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={`/seal?event=${FLAGSHIP_EVENT_ID}`} className="btn-primary">
              ▶ Seal Sunita’s claim
            </Link>
            <Link href="/ledger" className="btn-ghost">
              See the tamper-proof ledger
            </Link>
          </div>
          <p className="mt-4 text-xs text-soil-300">
            Keyless live demo · runs on real 2025 Churu weather + seeded satellite data · works on
            airplane mode.
          </p>
        </div>

        {/* Live ledger stats */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(stats.receipts)} label="receipts sealed" />
          <Stat value={stats.chainValid ? "intact ✓" : "broken ✗"} label="hash-chain" tone={stats.chainValid ? "green" : "brown"} />
          <Stat value={String(stats.farmersProtected)} label="farmers protected" />
          <Stat value={`${stats.hectaresProtected} ha`} label="area witnessed" />
        </div>
      </section>

      {/* The five real events */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold text-soil-100">Five genuine 2025 Churu-district losses</h2>
          <span className="text-xs text-soil-300">real coordinates · real Open-Meteo weather</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <Link
              key={b.event.id}
              href={`/seal?event=${b.event.id}`}
              className="card group p-5 transition hover:border-seal/40 hover:bg-night-600/70"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-soil-100">{b.farmer.name}</div>
                <div className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-soil-300">
                  {b.farmer.langPref.toUpperCase()}
                </div>
              </div>
              <div className="text-sm text-soil-300">
                {b.farmer.village}, {b.farmer.tehsil}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-soil-100">
                  {b.field.cropLabel}
                  <div className="text-xs text-soil-300">{b.event.lossLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-seal">{b.report?.score ?? "—"}</div>
                  <div className="text-[10px] text-soil-300">/ 100</div>
                </div>
              </div>
              <div className="mt-3 text-xs font-medium text-seal opacity-0 transition group-hover:opacity-100">
                Replay the seal →
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 card p-6 text-sm text-soil-300">
          <span className="font-semibold text-soil-100">The moat — VERIFICATION + INTEGRATION.</span>{" "}
          Remove every LLM and the seal, the append-only hash-chain, and the dual-source
          corroboration still stand. That is the interesting computer science, and it is covered by{" "}
          <Link href="/ledger" className="text-verify underline">42 passing tests</Link>.
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "green" | "brown" }) {
  const color = tone === "green" ? "text-ndvi-green" : tone === "brown" ? "text-ndvi-brown" : "text-seal";
  return (
    <div className="card p-4 text-center">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="label-muted mt-1">{label}</div>
    </div>
  );
}
