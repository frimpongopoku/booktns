import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { serializeBooking } from "@/lib/serialize";
import { sendBookingCancelledEmail } from "@/lib/email";
import { sendBookingCancelledSms } from "@/lib/sms";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  customerName: z.string().trim().min(1, "Name is required").optional(),
  customerPhone: z.string().trim().min(1, "Phone number is required").optional(),
  customerEmail: z.string().trim().email("Enter a valid email address").optional(),
  status: z.literal("cancelled").optional(),
});

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Public, unauthenticated — a guest's only "credential" is the unguessable
// booking slug itself (same trust model as the public /booking/[slug] page).
// Lets a customer edit their own details or cancel, but only while the
// booking is still pending; once the vendor confirms, both actions are
// locked and the customer is directed to contact the vendor directly.
export async function PATCH(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const existing = await db.booking.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!existing) {
    return NextResponse.json({ error: "Booking not found", code: "not_found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "This booking can no longer be changed — please contact the vendor directly.", code: "locked" },
      { status: 403 }
    );
  }

  let normalizedPhone: string | undefined;
  if (parsed.data.customerPhone !== undefined) {
    const result = normalizePhone(parsed.data.customerPhone);
    if (!result) {
      return NextResponse.json({ error: "Enter a valid phone number", code: "invalid_request" }, { status: 400 });
    }
    normalizedPhone = result;
  }

  const booking = await db.booking.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.customerName !== undefined ? { customerName: parsed.data.customerName } : {}),
      ...(normalizedPhone !== undefined ? { customerPhone: normalizedPhone } : {}),
      ...(parsed.data.customerEmail !== undefined ? { customerEmail: parsed.data.customerEmail } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
    include: {
      services: true,
      products: { include: { product: { select: { slug: true } } } },
      staffPreference: { select: { name: true } },
      assignedStaff: { select: { name: true } },
      paymentMethod: true,
      vendor: {
        select: {
          name: true,
          slug: true,
          location: true,
          logoUrl: true,
          phone: true,
          whatsapp: true,
          personalWhatsappNumber: true,
          cancellationPolicy: true,
          ownerEmail: true,
          showOwnerEmail: true,
        },
      },
    },
  });

  const serialized = serializeBooking(booking);

  // Only reachable transition here is pending -> cancelled (the guard above
  // already rejects any request once status isn't "pending", and status can
  // only ever be the literal "cancelled") — a plain self-service edit
  // (name/phone/email with no status change) never fires anything.
// Deferred with `after()` rather than left as a floating promise. On
// serverless (Vercel) the function can be frozen or torn down the moment the
// response is returned, so work started but not awaited is not guaranteed to
// run — that would mean booking emails, SMS and PDFs silently never sending
// in production. `after()` keeps the invocation alive until this finishes.
  if (parsed.data.status === "cancelled") {
    after(async () => {
    // Awaited as a group: `after()` only keeps the invocation alive for the
    // promise its callback returns, so leaving these unawaited inside it
    // would defer nothing and race the freeze exactly as before. Promise.all
    // keeps them concurrent while still being a single promise to wait on.
      await Promise.all([
        sendBookingCancelledEmail(
          serialized,
          // Same show-flag gate the storefront applies to the owner's address.
          { ...booking.vendor, ownerEmail: booking.vendor.showOwnerEmail ? booking.vendor.ownerEmail : null }
        ).catch((err) => logger.error("sendBookingCancelledEmail failed", { bookingId: booking.id, vendorId: booking.vendorId, err })),
        sendBookingCancelledSms(serialized, booking.vendor).catch((err) => logger.error("sendBookingCancelledSms failed", { bookingId: booking.id, vendorId: booking.vendorId, err })),
      ]);
    });
  }

  return NextResponse.json({ booking: serialized });
}
