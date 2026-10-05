import { useEffect, useState } from "react";
import { formatLabel } from "../../utils/format";

export type BarItem = {
  label: string;
  value: number;
  color: string;
  detail?: string;
  preserveLabel?: boolean;
};

export function BarList({ items, empty }: { items: BarItem[]; empty: string }) {
  const [ready, setReady] = useState(false);
  const max = Math.max(...items.map((item) => item.value), 1);
  const hasValue = items.some((item) => item.value > 0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!hasValue) return <p className="text-sm text-ink-soft">{empty}</p>;

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const width = ready ? Math.max(item.value === 0 ? 0 : 4, (item.value / max) * 100) : 0;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{item.preserveLabel ? item.label : formatLabel(item.label)}</span>
              <span className="shrink-0 text-ink-soft">{item.detail ?? item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${width}%`,
                  background: item.color,
                  transition: "width 0.7s ease",
                  transitionDelay: `${index * 60}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
