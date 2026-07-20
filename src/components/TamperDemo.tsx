"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type TamperResult = {
  index: number;
  original: string;
  newLossType: string;
  refix: boolean;
  before: { valid: boolean; reason?: string };
  after: { valid: boolean; reason?: string; brokenAt?: number; detail?: string };
};

/**
 * Live tamper demonstration. A judge clicks "Try to forge receipt #1" and
 * watches the chain go from intact → BROKEN, with the exact reason code. The
 * "also re-hash it" toggle shows that even a sophisticated forger who fixes the
 * edited receipt's own hash still breaks the NEXT receipt's back-link. The real
 * ledger is never modified — this runs on a server-side copy.
 */
export function TamperDemo() {
  const [result, setResult] = useState<TamperResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [refix, setRefix] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/tamper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: 1, newLossType: "drought", refix }),
      });
      setResult(await res.json());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-soil-100">Try to forge a claim</h2>
          <p className="text-sm text-soil-300">
            Rewrite a sealed receipt&apos;s loss type and watch the math catch it. The live ledger is
            never touched.
          </p>
        </div>
        <button className="btn-primary !py-3 !text-base" onClick={run} disabled={loading}>
          {loading ? "Forging…" : "⚒️ Forge receipt #1"}
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-soil-300">
        <input
          type="checkbox"
          checked={refix}
          onChange={(e) => setRefix(e.target.checked)}
          className="h-4 w-4 accent-seal"
        />
        Also re-hash the forged receipt (the sophisticated-attacker move)
      </label>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 grid gap-3 sm:grid-cols-2"
        >
          <div className="rounded-2xl border border-ndvi-green/30 bg-ndvi-green/5 p-4">
            <div className="label-muted">Before tampering</div>
            <div className="mt-1 text-2xl font-black text-ndvi-green">
              {result.before.valid ? "CHAIN INTACT ✓" : "broken"}
            </div>
            <div className="mono mt-1 text-xs text-soil-300">{result.before.reason}</div>
          </div>
          <div className="rounded-2xl border border-ndvi-brown/40 bg-ndvi-brown/10 p-4">
            <div className="label-muted">
              After forging &ldquo;{result.original}&rdquo; → &ldquo;{result.newLossType}&rdquo;
              {result.refix ? " (+ re-hash)" : ""}
            </div>
            <div className="mt-1 text-2xl font-black text-ndvi-brown">
              {result.after.valid ? "still valid?!" : "TAMPER DETECTED ✗"}
            </div>
            <div className="mono mt-1 text-xs text-seal">{result.after.reason}</div>
            {result.after.detail && (
              <div className="mt-1 text-xs text-soil-300">{result.after.detail}</div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
