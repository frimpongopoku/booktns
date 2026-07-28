import { db } from "@/lib/db";

interface GetAvailableSlotsParams {
  vendorId: string;
  date: string; // "YYYY-MM-DD"
  durationMinutes: number;
  staffId?: string;
  // Excludes a booking from its own conflict check — used when rescheduling,
  // since the booking's current (pre-reschedule) row would otherwise always
  // "conflict" with any new slot check performed before it's updated.
  excludeBookingId?: string;
}

// Matches the granularity the storefront's old hardcoded time-slot list used.
const SLOT_STEP_MINUTES = 30;

// The app has no per-vendor timezone concept anywhere (Vendor has no
// timezone field) and is built for a Ghana-only market (GHS pricing,
// +233 default phone) — Ghana Standard Time is UTC+0 year-round, no DST, so
// treating every date/time here as plain UTC is correct for this app's
// actual target market, not just a shortcut.
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Real availability, reused by the public /api/availability endpoint,
// POST /api/bookings's own re-check at submission time (closing the race
// window between two customers grabbing the same slot), and the dashboard's
// Reschedule action.
export async function getAvailableSlots({
  vendorId,
  date,
  durationMinutes,
  staffId,
  excludeBookingId,
}: GetAvailableSlotsParams): Promise<string[]> {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return [];

  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

  // These two don't depend on each other's results — fetch concurrently
  // rather than one-after-another. The conflicts query ends up being wasted
  // work on a closed day (discarded below), but that's cheap relative to the
  // round-trip this saves on every open day, the common case, across all
  // three callers of this function.
  const [hours, conflicts] = await Promise.all([
    db.businessHours.findUnique({ where: { vendorId_dayOfWeek: { vendorId, dayOfWeek } } }),
    db.booking.findMany({
      where: {
        vendorId,
        status: { in: ["pending", "confirmed"] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        ...(staffId ? { OR: [{ assignedStaffId: staffId }, { staffPreferenceId: staffId }] } : {}),
      },
      select: { startTime: true, endTime: true },
    }),
  ]);
  if (!hours || hours.isClosed || !hours.openTime || !hours.closeTime) return [];

  const openMinutes = parseTimeToMinutes(hours.openTime);
  const closeMinutes = parseTimeToMinutes(hours.closeTime);

  const now = new Date();
  const isToday = now >= dayStart && now < dayEnd;

  const slots: string[] = [];
  for (let start = openMinutes; start + durationMinutes <= closeMinutes; start += SLOT_STEP_MINUTES) {
    const end = start + durationMinutes;
    const slotStart = new Date(Date.UTC(year, month - 1, day, 0, start));
    const slotEnd = new Date(Date.UTC(year, month - 1, day, 0, end));

    if (isToday && slotStart <= now) continue;

    const hasConflict = conflicts.some((b) => slotStart < b.endTime && slotEnd > b.startTime);
    if (!hasConflict) slots.push(minutesToTime(start));
  }

  return slots;
}
