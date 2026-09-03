import type { BookingStatus } from "@/types";

// Mirrors what components/dashboard/BookingsClient.tsx already exposes in
// the UI (Confirm only from pending; Complete/Cancel/Reschedule/No-show only
// while active; nothing once terminal) — enforced here too so the API can't
// be driven into a state the UI never allows.
export const TERMINAL_STATUSES: BookingStatus[] = ["completed", "cancelled", "no_show"];

export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled", "rescheduled"],
  confirmed: ["completed", "cancelled", "rescheduled", "no_show"],
  rescheduled: ["completed", "cancelled", "rescheduled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}
