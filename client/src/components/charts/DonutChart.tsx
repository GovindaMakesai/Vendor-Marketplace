import { useEffect, useState } from "react";
import { formatLabel } from "../../utils/format";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({ segments, caption }: { segments: DonutSegment[]; caption: string }) {
  const [ready, setReady] = useState(false);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0" role="img" aria-label={caption}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#efe8dc" strokeWidth="14" />
        {total > 0
          ? segments.map((segment) => {
              const full = (segment.value / total) * circumference;
              const length = ready ? full : 0;
              const dashOffset = -offset;
              offset += (segment.value / total) * circumference;
              return (
                <circle
                  key={segment.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray={`${length} ${Math.max(circumference - length, 0.01)}`}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dasharray 0.7s ease" }}
                />
              );
            })
          : null}
        <text x="60" y="58" textAnchor="middle" fill="#142433" fontSize="16" fontWeight="700">
          {total}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#3d4d5c" fontSize="8">
          records
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: segment.color }} />
              <span className="truncate">{formatLabel(segment.label)}</span>
            </span>
            <span className="font-semibold">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
