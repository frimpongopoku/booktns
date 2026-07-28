import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeBooking } from "@/lib/serialize";
import { getAvailableSlots } from "@/lib/availability";

const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled", "rescheduled"] as const;

const updateSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  assignedStaffId: z.string().trim().nullable().optional(),
  notes: z.string().trim().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const existing = await db.booking.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true, staffPreferenceId: true, assignedStaffId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found", code: "not_found" }, { status: 404 });
  }

  // Reschedule — re-check availability server-side rather than trusting
  // that the dashboard's own /api/availability lookup is still fresh.
  if (parsed.data.startTime && parsed.data.endTime) {
    const newStart = new Date(parsed.data.startTime);
    const newEnd = new Date(parsed.data.endTime);
    const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / 60_000);
    const date = newStart.toISOString().slice(0, 10);
    const time = newStart.toISOString().slice(11, 16);
    const staffId = existing.assignedStaffId ?? existing.staffPreferenceId ?? undefined;

    const slots = await getAvailableSlots({
      vendorId: auth.session.vendorId,
      date,
      durationMinutes,
      staffId: staffId ?? undefined,
      excludeBookingId: id,
    });
    if (!slots.includes(time)) {
      return NextResponse.json(
        { error: "That time is no longer available — please pick another slot", code: "slot_unavailable" },
        { status: 409 }
      );
    }
  }

  if (parsed.data.assignedStaffId) {
    const staff = await db.staff.findFirst({
      where: { id: parsed.data.assignedStaffId, vendorId: auth.session.vendorId, active: true },
      select: { id: true },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff member not found", code: "not_found" }, { status: 400 });
    }
  }

  const booking = await db.booking.update({
    where: { id },
    data: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.assignedStaffId !== undefined ? { assignedStaffId: parsed.data.assignedStaffId || null } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.startTime !== undefined ? { startTime: new Date(parsed.data.startTime) } : {}),
      ...(parsed.data.endTime !== undefined ? { endTime: new Date(parsed.data.endTime) } : {}),
    },
    include: {
      services: true,
      products: true,
      staffPreference: { select: { name: true } },
      assignedStaff: { select: { name: true } },
      paymentMethod: true,
    },
  });

  return NextResponse.json({ booking: serializeBooking(booking) });
}
