interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn";
}

export default function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const accent = tone === "warn" ? "var(--amber)" : "var(--tx)";
  return (
    <div
      className="p-4 rounded-[var(--rl)]"
      style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: accent }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
