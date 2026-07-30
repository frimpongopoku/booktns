import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { serializeBooking } from "@/lib/serialize";
import { getAvailableSlots } from "@/lib/availability";
import { generateConfirmedBookingPdf } from "@/lib/pdf";
import { uploadFile } from "@/lib/storage";
import { sendBookingConfirmedEmail } from "@/lib/email";
import { sendBookingConfirmedSms } from "@/lib/sms";

const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled", "rescheduled"] as const;

const MAX_SERIALIZATION_ATTEMPTS = 3;

// Thrown when the in-transaction availability recheck finds the slot gone —
// distinct from a transient write conflict, so the retry loop below doesn't
// retry it (the slot really is taken).
class SlotUnavailableError extends Error {}

// See app/api/bookings/route.ts's runSerializable for why this exists —
// same shape, duplicated rather than shared since these are the only two
// call sites.
async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_ATTEMPTS; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      const isWriteConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (isWriteConflict && attempt < MAX_SERIALIZATION_ATTEMPTS - 1) continue;
      throw err;
    }
  }
  throw new Error("unreachable");
}

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
    select: {
      id: true,
      status: true,
      staffPreferenceId: true,
      assignedStaffId: true,
      startTime: true,
      endTime: true,
      vendor: { select: { name: true, location: true, logoUrl: true, cancellationPolicy: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found", code: "not_found" }, { status: 404 });
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

  const willChangeTime = Boolean(parsed.data.startTime && parsed.data.endTime);
  const nextAssignedStaffId = parsed.data.assignedStaffId !== undefined ? parsed.data.assignedStaffId : existing.assignedStaffId;
  const willChangeStaff = nextAssignedStaffId !== null && nextAssignedStaffId !== existing.assignedStaffId;

  let booking;
  try {
    booking = await runSerializable(async (tx) => {
      // Reschedule and staff (re)assignment both change what occupies this
      // booking's slot — re-check availability, atomically with the update
      // below, whenever either is changing. Previously assigning staff had
      // no check at all, letting a vendor double-book a stylist silently.
      if (willChangeTime || willChangeStaff) {
        const newStart = parsed.data.startTime ? new Date(parsed.data.startTime) : existing.startTime;
        const newEnd = parsed.data.endTime ? new Date(parsed.data.endTime) : existing.endTime;
        const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / 60_000);
        const date = newStart.toISOString().slice(0, 10);
        const time = newStart.toISOString().slice(11, 16);
        const staffId = willChangeStaff
          ? nextAssignedStaffId!
          : (existing.assignedStaffId ?? existing.staffPreferenceId ?? undefined);

        const slots = await getAvailableSlots({
          vendorId: auth.session.vendorId,
          date,
          durationMinutes,
          staffId: staffId ?? undefined,
          excludeBookingId: id,
          client: tx,
        });
        if (!slots.includes(time)) {
          throw new SlotUnavailableError();
        }
      }

      return tx.booking.update({
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
    });
  } catch (err) {
    if (err instanceof SlotUnavailableError) {
      return NextResponse.json(
        { error: "That time is no longer available — please pick another slot", code: "slot_unavailable" },
        { status: 409 }
      );
    }
    throw err;
  }

  let serialized = serializeBooking(booking);
  const vendorInfo = existing.vendor;

  // Confirmed Booking PDF is generated once, only on the transition into
  // "confirmed" — never regenerated on later edits to the same booking.
  if (existing.status !== "confirmed" && parsed.data.status === "confirmed") {
    try {
      const pdfBuffer = await generateConfirmedBookingPdf(serialized, vendorInfo);
      const confirmedPdfUrl = await uploadFile(`bookings/${booking.slug}/confirmed.pdf`, pdfBuffer, "application/pdf");
      const updated = await db.booking.update({
        where: { id },
        data: { confirmedPdfUrl },
        include: {
          services: true,
          products: true,
          staffPreference: { select: { name: true } },
          assignedStaff: { select: { name: true } },
          paymentMethod: true,
        },
      });
      serialized = serializeBooking(updated);
    } catch (err) {
      console.error("generateConfirmedBookingPdf failed", err);
    }

    sendBookingConfirmedEmail(serialized, vendorInfo).catch((err) => console.error("sendBookingConfirmedEmail failed", err));
    sendBookingConfirmedSms(serialized, vendorInfo).catch((err) => console.error("sendBookingConfirmedSms failed", err));
  }

  return NextResponse.json({ booking: serialized });
}
