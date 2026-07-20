"use client";

import { useState } from "react";

/** Print + copy-verify-link actions for the Loss Receipt. */
export function ReceiptActions({ verifyUrl }: { verifyUrl: string }) {
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
      <button className="btn-ghost" onClick={() => window.print()}>
        🖨️ Print / Save PDF
      </button>
      <button className="btn-ghost" onClick={copy}>
        {copied ? "✓ Link copied" : "🔗 Copy verify link"}
      </button>
    </div>
  );
}
