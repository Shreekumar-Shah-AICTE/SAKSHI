"use client";

/**
 * The 0–100 corroboration dial. The score IS the moat's headline, so it is
 * shown boldly — but the maths that produced it stays hidden behind the
 * "How was this verified?" disclosure (UX law: dramatize the proof, hide the
 * mechanism).
 */
export function CorroborationDial({
  score,
  size = 180,
  label = "Corroboration",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = c * pct;

  const color = score >= 85 ? "#2fbf5b" : score >= 65 ? "#f5a524" : "#e0b34a";

  return (
    <div style={{ width: size, height: size }} className="relative">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black text-soil-100" style={{ color }}>
          {score}
        </div>
        <div className="text-xs text-soil-300">/ 100</div>
        <div className="label-muted mt-1">{label}</div>
      </div>
    </div>
  );
}
