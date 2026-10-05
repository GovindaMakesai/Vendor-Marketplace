import type { CSSProperties, ReactNode } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section style={style} className={`rounded-2xl border border-line bg-card p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}
