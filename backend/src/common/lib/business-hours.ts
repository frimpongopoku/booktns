export interface DayHours {
  dayOfWeek: number; // 0=Sun..6=Sat
  isClosed: boolean;
  openTime: string | null; // "HH:MM"
  closeTime: string | null; // "HH:MM"
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Monday-first, wrapping Sunday to the end — the order a vendor actually
// reads their own week in, and what "Mon–Sat 9am–7pm" (the old free-text
// default) meant.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mStr === "00" ? `${h12}${period}` : `${h12}:${mStr}${period}`;
}

// Collapses a vendor's 7-day BusinessHours rows into the same kind of
// compact summary vendors used to type by hand ("Mon–Sat 9am–7pm"), so it
// can be stored on Vendor.hours and read everywhere that used to trust that
// free-text field — without ever letting the two drift apart, since this is
// now the only thing that writes it. Consecutive days sharing identical
// hours (or all closed) are grouped into one range rather than spelled out
// day by day.
export function formatBusinessHours(days: DayHours[]): string {
  const byDay = new Map(days.map((d) => [d.dayOfWeek, d]));
  const ordered = WEEK_ORDER.map((dow) => byDay.get(dow)).filter((d): d is DayHours => Boolean(d));
  if (ordered.length === 0) return "";

  const key = (d: DayHours) => (d.isClosed || !d.openTime || !d.closeTime ? "closed" : `${d.openTime}-${d.closeTime}`);

  const groups: { start: number; end: number; day: DayHours }[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const day = ordered[i];
    const last = groups[groups.length - 1];
    if (last && key(last.day) === key(day)) {
      last.end = i;
    } else {
      groups.push({ start: i, end: i, day });
    }
  }

  const dayLabel = (idx: number) => DAY_ABBR[WEEK_ORDER[idx]];

  const parts = groups
    .filter((g) => key(g.day) !== "closed")
    .map((g) => {
      const range = g.start === g.end ? dayLabel(g.start) : `${dayLabel(g.start)}–${dayLabel(g.end)}`;
      return `${range} ${formatTime12h(g.day.openTime!)}–${formatTime12h(g.day.closeTime!)}`;
    });

  return parts.length > 0 ? parts.join(", ") : "Closed";
}
