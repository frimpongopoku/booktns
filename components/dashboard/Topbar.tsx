import { ReactNode } from "react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div
      className="flex items-start sm:items-center justify-between gap-4 pb-5 mb-6"
      style={{ borderBottom: "1px solid var(--bd)" }}
    >
      <div>
        <h1
          className="font-display text-2xl font-medium"
          style={{ color: "var(--tx)", fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "var(--tx3)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
