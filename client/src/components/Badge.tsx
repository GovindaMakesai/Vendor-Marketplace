import { badgeTone, formatLabel } from "../utils/format";

const tones = {
  good: "bg-emerald-50 text-good",
  info: "bg-teal-50 text-accent-strong",
  warn: "bg-amber-50 text-warn",
  bad: "bg-rose-50 text-bad",
  neutral: "bg-stone-100 text-ink-soft",
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[badgeTone(value)]}`}>
      {formatLabel(value)}
    </span>
  );
}
