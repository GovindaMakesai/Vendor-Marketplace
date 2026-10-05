export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-line bg-card text-sm text-ink-soft">
      {label}...
    </div>
  );
}
