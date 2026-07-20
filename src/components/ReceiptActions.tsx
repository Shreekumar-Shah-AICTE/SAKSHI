"use client";

import { useState } from "react";

/** Actions for the Loss Receipt: open the appeal dossier, copy the verify link. */
export function ReceiptActions({
  verifyUrl,
  receiptHash,
}: {
  verifyUrl: string;
  receiptHash: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <a className="btn-primary !py-3 !text-base" href={`/dossier/${receiptHash}`}>
        📄 Appeal-ready dossier
      </a>
      <a className="btn-ghost" href={`/api/dossier/${receiptHash}`}>
        ⬇️ Export JSON
      </a>
      <button className="btn-ghost" onClick={copy}>
        {copied ? "✓ Link copied" : "🔗 Copy verify link"}
      </button>
    </div>
  );
}
