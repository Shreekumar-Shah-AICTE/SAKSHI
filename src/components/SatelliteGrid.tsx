"use client";

import { ndviColor } from "@/lib/utils";

/**
 * The satellite field render. A coarse NDVI grid that morphs from the healthy
 * "before" scene to the collapsed "after" scene as `phase` goes 0 → 1. This is
 * the green→brown heart of the Moment — the proof, shown loud.
 */
export function SatelliteGrid({
  before,
  after,
  phase,
  className,
  rounded = true,
}: {
  before: number[][];
  after: number[][];
  phase: number; // 0 = healthy before, 1 = collapsed after
  className?: string;
  rounded?: boolean;
}) {
  const size = before.length;
  const p = Math.max(0, Math.min(1, phase));
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gap: 2,
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: rounded ? 18 : 0,
        overflow: "hidden",
        background: "#0d1526",
        padding: 4,
      }}
      role="img"
      aria-label={p < 0.5 ? "Satellite view: healthy green field" : "Satellite view: crop collapsed to brown"}
    >
      {before.flatMap((row, y) =>
        row.map((b, x) => {
          const a = after[y][x];
          const v = b * (1 - p) + a * p;
          return (
            <div
              key={`${x}-${y}`}
              style={{
                background: ndviColor(v),
                borderRadius: 4,
                transition: "background 90ms linear",
              }}
            />
          );
        }),
      )}
    </div>
  );
}
