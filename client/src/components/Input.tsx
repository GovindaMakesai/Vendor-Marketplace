import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none ring-accent/30 placeholder:text-ink-soft/60 focus:ring-2";

export function Input({ label, error, id, ...props }: InputProps) {
  const fieldId = id ?? props.name;
  return (
    <label className="block space-y-1.5 text-sm" htmlFor={fieldId}>
      <span className="font-medium text-ink">{label}</span>
      <input id={fieldId} className={fieldClass} {...props} />
      {error ? <span className="block text-xs text-bad">{error}</span> : null}
    </label>
  );
}

export function TextArea({ label, error, id, ...props }: TextAreaProps) {
  const fieldId = id ?? props.name;
  return (
    <label className="block space-y-1.5 text-sm" htmlFor={fieldId}>
      <span className="font-medium text-ink">{label}</span>
      <textarea id={fieldId} className={`${fieldClass} min-h-28 resize-y`} {...props} />
      {error ? <span className="block text-xs text-bad">{error}</span> : null}
    </label>
  );
}
