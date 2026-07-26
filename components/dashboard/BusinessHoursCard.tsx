"use client";

import { useState } from "react";
import type { BusinessHours } from "@/types";
import Button from "@/components/ui/Button";
import { Check } from "lucide-react";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayRow {
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
}

interface ApiErrorBody {
  error: string;
  code: string;
}

function toRows(hours: BusinessHours[]): DayRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = hours.find((h) => h.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      isClosed: existing?.isClosed ?? false,
      openTime: existing?.openTime ?? "09:00",
      closeTime: existing?.closeTime ?? "19:00",
    };
  });
}

interface BusinessHoursCardProps {
  initialHours: BusinessHours[];
}

export default function BusinessHoursCard({ initialHours }: BusinessHoursCardProps) {
  const [rows, setRows] = useState<DayRow[]>(toRows(initialHours));
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (dayOfWeek: number, patch: Partial<DayRow>) => {
    setRows((prev) => prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/vendor/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: rows.map((row) => ({
            dayOfWeek: row.dayOfWeek,
            isClosed: row.isClosed,
            openTime: row.isClosed ? null : row.openTime,
            closeTime: row.isClosed ? null : row.closeTime,
          })),
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Business hours</p>

      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.dayOfWeek}
            className="flex items-center gap-3 p-3 rounded-[var(--r)] flex-wrap sm:flex-nowrap"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <span className="text-sm font-medium w-24 flex-shrink-0" style={{ color: "var(--tx)" }}>
              {DAY_LABELS[row.dayOfWeek]}
            </span>

            <button
              onClick={() => updateRow(row.dayOfWeek, { isClosed: !row.isClosed })}
              className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
              style={
                row.isClosed
                  ? { background: "var(--bds)", color: "var(--tx3)" }
                  : { background: "var(--green-bg)", color: "var(--green)" }
              }
            >
              {row.isClosed ? "Closed" : "Open"}
            </button>

            {!row.isClosed && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="time"
                  value={row.openTime}
                  onChange={(e) => updateRow(row.dayOfWeek, { openTime: e.target.value })}
                  className="px-2.5 py-1.5 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
                  style={{ background: "var(--bg)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                />
                <span className="text-xs" style={{ color: "var(--tx3)" }}>to</span>
                <input
                  type="time"
                  value={row.closeTime}
                  onChange={(e) => updateRow(row.dayOfWeek, { closeTime: e.target.value })}
                  className="px-2.5 py-1.5 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
                  style={{ background: "var(--bg)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button loading={loading} onClick={handleSave} className="w-fit">
        {saved ? <><Check size={14} /> Saved</> : "Save Business Hours"}
      </Button>
    </div>
  );
}
