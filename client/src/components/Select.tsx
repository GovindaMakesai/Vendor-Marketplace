import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export function Select({ label, error, id, children, ...props }: SelectProps) {
  const fieldId = id ?? props.name;
  return (
    <label className="block space-y-1.5 text-sm" htmlFor={fieldId}>
      <span className="font-medium text-ink">{label}</span>
      <select
        id={fieldId}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none ring-accent/30 focus:ring-2"
        {...props}
      >
        {children}
      </select>
      {error ? <span className="block text-xs text-bad">{error}</span> : null}
    </label>
  );
}
