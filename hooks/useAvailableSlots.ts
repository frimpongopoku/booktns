"use client";

import { useEffect, useState } from "react";

interface UseAvailableSlotsParams {
  vendorSlug: string;
  date: string | null;
  durationMinutes: number;
  staffId?: string | null;
  excludeBookingId?: string;
}

interface UseAvailableSlotsResult {
  slots: string[];
  loading: boolean;
}

// Fetches real open time slots from /api/availability whenever the inputs
// change — shared by the customer-facing booking wizard
// (components/storefront/BookingFlow.tsx) and the dashboard's reschedule
// picker (components/dashboard/BookingsClient.tsx), which need the identical
// fetch/loading/reset sequence. Does not own "which slot is selected" — that
// stays caller-side UI state, reset by the caller whenever `date` changes.
export function useAvailableSlots({
  vendorSlug,
  date,
  durationMinutes,
  staffId,
  excludeBookingId,
}: UseAvailableSlotsParams): UseAvailableSlotsResult {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || durationMinutes <= 0) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ vendorSlug, date, durationMinutes: String(durationMinutes) });
    if (staffId) params.set("staffId", staffId);
    if (excludeBookingId) params.set("excludeBookingId", excludeBookingId);

    fetch(`/api/availability?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { slots: [] }))
      .then((data: { slots: string[] }) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vendorSlug, date, durationMinutes, staffId, excludeBookingId]);

  return { slots, loading };
}
