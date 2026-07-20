"use client";

/** A minimal client-side print trigger for the appeal dossier page. */
export function PrintButton() {
  return (
    <button className="btn" onClick={() => window.print()}>
      🖨️ Save / Print PDF
    </button>
  );
}
