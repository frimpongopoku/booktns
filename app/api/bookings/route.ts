import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { generateBookingSlug, generateDepositReferenceCode } from "@/lib/slugs";
import { getAvailableSlots } from "@/lib/availability";
import { calculateDepositAmountPesewas } from "@/lib/deposit";
import { serializeBooking } from "@/lib/serialize";
import { sendBookingRequestEmail, sendNewBookingNotification } from "@/lib/email";
import { sendBookingRequestSms, sendNewBookingSms } from "@/lib/sms";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  vendorSlug: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z.string().trim().min(1, "Phone number is required"),
  customerEmail: z.string().trim().email("Enter a valid email address"),
  serviceIds: z.array(z.string().trim().min(1)).min(1, "Select at least one service"),
  products: z
    .array(z.object({ productId: z.string().trim().min(1), quantity: z.number().int().positive() }))
    .optional(),
  staffPreferenceId: z.string().trim().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  paymentMethodId: z.string().trim().nullable().optional(),
  notes: z.string().trim().optional(),
});

const MAX_SLUG_ATTEMPTS = 5;
const MAX_SERIALIZATION_ATTEMPTS = 3;

// Thrown when the authoritative in-transaction recheck finds the slot gone —
// distinct from a transient write conflict, so the retry loop below knows
// not to retry it (the slot really is taken, retrying won't change that).
class SlotUnavailableError extends Error {}

// Runs `fn` inside a Serializable transaction, retrying on P2034 ("Transaction
// failed due to a write conflict") — Postgres's signal that two overlapping
// transactions raced and one has to lose. Without this, the availability
// recheck and the booking insert are two separate statements with a gap
// between them, and two near-simultaneous submissions for the same slot can
// both pass the recheck before either commits.
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

// Public, unauthenticated — guest booking, same trust model as POST /api/orders.
export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const vendor = await db.vendor.findUnique({
    where: { slug: parsed.data.vendorSlug },
    select: {
      id: true,
      name: true,
      active: true,
      storefrontPublished: true,
      depositSetting: true,
      depositValue: true,
      cancellationPolicy: true,
      logoUrl: true,
      location: true,
      phone: true,
      whatsapp: true,
      personalWhatsappNumber: true,
      ownerEmail: true,
      showOwnerEmail: true,
    },
  });
  if (!vendor || !vendor.active || !vendor.storefrontPublished) {
    return NextResponse.json({ error: "Shop not found", code: "not_found" }, { status: 404 });
  }

  const requestedProducts = parsed.data.products ?? [];

  // None of these five lookups depend on each other's results (each only
  // needs vendor.id + fields already in parsed.data) — fetch concurrently
  // rather than as five sequential round trips.
  const [services, products, staffMatch, paymentMethodMatch, notifyStaff] = await Promise.all([
    db.service.findMany({ where: { id: { in: parsed.data.serviceIds }, vendorId: vendor.id, active: true } }),
    requestedProducts.length > 0
      ? db.product.findMany({ where: { id: { in: requestedProducts.map((p) => p.productId) }, vendorId: vendor.id, active: true } })
      : Promise.resolve([]),
    parsed.data.staffPreferenceId
      ? db.staff.findFirst({ where: { id: parsed.data.staffPreferenceId, vendorId: vendor.id, active: true }, select: { id: true } })
      : Promise.resolve(null),
    parsed.data.paymentMethodId
      ? db.paymentMethod.findFirst({ where: { id: parsed.data.paymentMethodId, vendorId: vendor.id, active: true }, select: { id: true } })
      : Promise.resolve(null),
    db.staff.findMany({ where: { vendorId: vendor.id, role: { in: ["Owner", "Management"] }, active: true }, select: { email: true, phone: true } }),
  ]);

  if (services.length !== new Set(parsed.data.serviceIds).size) {
    return NextResponse.json(
      { error: "One or more selected services are no longer available", code: "invalid_request" },
      { status: 400 }
    );
  }

  const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalServicePesewas = services.reduce((sum, s) => sum + s.priceInPesewas, 0);

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of requestedProducts) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: "One or more flagged products are no longer available", code: "invalid_request" },
        { status: 400 }
      );
    }
    if (item.quantity > product.stockCount) {
      return NextResponse.json(
        { error: `Only ${product.stockCount} of "${product.name}" left in stock`, code: "invalid_request" },
        { status: 400 }
      );
    }
  }

  if (parsed.data.staffPreferenceId && !staffMatch) {
    return NextResponse.json({ error: "Staff member not found", code: "not_found" }, { status: 400 });
  }

  if (parsed.data.paymentMethodId && !paymentMethodMatch) {
    return NextResponse.json({ error: "Payment method not found", code: "not_found" }, { status: 400 });
  }

  // Cheap fail-fast check, outside any transaction — catches the common,
  // non-racing case (slot was simply taken a while ago) before doing the
  // rest of this request's work. Not the actual correctness guarantee —
  // that's the recheck inside the transaction below.
  const availableSlots = await getAvailableSlots({
    vendorId: vendor.id,
    date: parsed.data.date,
    durationMinutes: totalDurationMinutes,
    staffId: parsed.data.staffPreferenceId ?? undefined,
  });
  if (!availableSlots.includes(parsed.data.startTime)) {
    return NextResponse.json(
      { error: "That time is no longer available — please pick another slot", code: "slot_unavailable" },
      { status: 409 }
    );
  }

  const normalizedPhone = normalizePhone(parsed.data.customerPhone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid phone number", code: "invalid_request" }, { status: 400 });
  }

  const [year, month, day] = parsed.data.date.split("-").map(Number);
  const [startHour, startMinute] = parsed.data.startTime.split(":").map(Number);
  const startTime = new Date(Date.UTC(year, month - 1, day, startHour, startMinute));
  const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60_000);

  const depositAmountPesewas = calculateDepositAmountPesewas(vendor.depositSetting, vendor.depositValue, totalServicePesewas);

  const bookingServices = services.map((s) => ({
    serviceId: s.id,
    name: s.name,
    priceAtBooking: s.priceInPesewas,
    durationMinutes: s.durationMinutes,
  }));
  const bookingProducts = requestedProducts.map((item) => {
    const product = productMap.get(item.productId)!;
    return { productId: product.id, name: product.name, priceAtBooking: product.priceInPesewas, quantity: item.quantity };
  });

  let booking;
  try {
    booking = await runSerializable(async (tx) => {
      // Authoritative recheck, atomic with the create below — this is what
      // actually closes the race window between two customers submitting
      // the same slot at once, not the fail-fast check above.
      const slots = await getAvailableSlots({
        vendorId: vendor.id,
        date: parsed.data.date,
        durationMinutes: totalDurationMinutes,
        staffId: parsed.data.staffPreferenceId ?? undefined,
        client: tx,
      });
      if (!slots.includes(parsed.data.startTime)) {
        throw new SlotUnavailableError();
      }

      for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
        try {
          return await tx.booking.create({
            data: {
              vendorId: vendor.id,
              slug: generateBookingSlug(),
              customerName: parsed.data.customerName,
              customerPhone: normalizedPhone,
              customerEmail: parsed.data.customerEmail,
              staffPreferenceId: parsed.data.staffPreferenceId || null,
              startTime,
              endTime,
              notes: parsed.data.notes ?? "",
              depositAmountPesewas,
              depositReferenceCode: depositAmountPesewas > 0 ? generateDepositReferenceCode() : null,
              paymentMethodId: parsed.data.paymentMethodId || null,
              services: { create: bookingServices },
              products: { create: bookingProducts },
            },
            include: {
              services: true,
              products: { include: { product: { select: { slug: true } } } },
              staffPreference: { select: { name: true } },
              assignedStaff: { select: { name: true } },
              paymentMethod: true,
            },
          });
        } catch (err) {
          const isSlugConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
          if (isSlugConflict && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
          throw err;
        }
      }
      throw new Error("Could not generate a unique booking slug");
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

  const serialized = serializeBooking(booking);
  const vendorInfo = {
    name: vendor.name,
    slug: parsed.data.vendorSlug,
    logoUrl: vendor.logoUrl,
    location: vendor.location,
    phone: vendor.phone,
    whatsapp: vendor.whatsapp,
    personalWhatsappNumber: vendor.personalWhatsappNumber,
    cancellationPolicy: vendor.cancellationPolicy,
    // Only if the vendor publishes it — same gate the storefront applies.
    ownerEmail: vendor.showOwnerEmail ? vendor.ownerEmail : null,
  };
  const notifyStaffPhones = notifyStaff.map((s) => s.phone).filter((phone): phone is string => Boolean(phone));
// Deferred with `after()` rather than left as a floating promise. On
// serverless (Vercel) the function can be frozen or torn down the moment the
// response is returned, so work started but not awaited is not guaranteed to
// run — that would mean booking emails, SMS and PDFs silently never sending
// in production. `after()` keeps the invocation alive until this finishes.
  // A slow or failing email/SMS provider must never hold up the booking
  // response or fail an otherwise-successful booking.
  after(async () => {
    // Awaited as a group: `after()` only keeps the invocation alive for the
    // promise its callback returns, so leaving these unawaited inside it
    // would defer nothing and race the freeze exactly as before. Promise.all
    // keeps them concurrent while still being a single promise to wait on.
    await Promise.all([
      sendBookingRequestEmail(serialized, vendorInfo).catch((err) => logger.error("sendBookingRequestEmail failed", { bookingId: serialized.id, vendorId: vendor.id, err })),
      sendNewBookingNotification(serialized, vendorInfo, notifyStaff.map((s) => s.email)).catch((err) =>
        logger.error("sendNewBookingNotification failed", { bookingId: serialized.id, vendorId: vendor.id, err })
      ),
      sendBookingRequestSms(serialized, vendorInfo).catch((err) => logger.error("sendBookingRequestSms failed", { bookingId: serialized.id, vendorId: vendor.id, err })),
      sendNewBookingSms(serialized, notifyStaffPhones).catch((err) => logger.error("sendNewBookingSms failed", { bookingId: serialized.id, vendorId: vendor.id, err })),
    ]);
  });

  return NextResponse.json({ booking: serialized }, { status: 201 });
}

// Dashboard booking list — vendor-scoped, staff-authenticated.
export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const bookings = await db.booking.findMany({
    where: { vendorId: auth.session.vendorId },
    include: {
      services: true,
      products: { include: { product: { select: { slug: true } } } },
      staffPreference: { select: { name: true } },
      assignedStaff: { select: { name: true } },
      paymentMethod: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings: bookings.map(serializeBooking) });
}
