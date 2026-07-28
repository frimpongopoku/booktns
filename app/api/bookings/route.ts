import { NextResponse } from "next/server";
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
    select: { id: true, name: true, active: true, storefrontPublished: true, depositSetting: true, depositValue: true, cancellationPolicy: true },
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
    db.staff.findMany({ where: { vendorId: vendor.id, role: { in: ["Owner", "Management"] }, active: true }, select: { email: true } }),
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

  // Re-check availability at submission time — closes the race window
  // between two customers being shown the same slot.
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

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    try {
      const booking = await db.booking.create({
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
          products: true,
          staffPreference: { select: { name: true } },
          assignedStaff: { select: { name: true } },
          paymentMethod: true,
        },
      });

      const serialized = serializeBooking(booking);
      const vendorInfo = { name: vendor.name, cancellationPolicy: vendor.cancellationPolicy };
      // Fire-and-forget — a slow or failing email provider must never hold
      // up the booking response or fail an otherwise-successful booking.
      sendBookingRequestEmail(serialized, vendorInfo).catch((err) => console.error("sendBookingRequestEmail failed", err));
      sendNewBookingNotification(serialized, vendorInfo, notifyStaff.map((s) => s.email)).catch((err) =>
        console.error("sendNewBookingNotification failed", err)
      );

      return NextResponse.json({ booking: serialized }, { status: 201 });
    } catch (err) {
      const isSlugConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (isSlugConflict && attempt < MAX_SLUG_ATTEMPTS - 1) continue;
      throw err;
    }
  }

  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "server_error" }, { status: 500 });
}

// Dashboard booking list — vendor-scoped, staff-authenticated.
export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const bookings = await db.booking.findMany({
    where: { vendorId: auth.session.vendorId },
    include: {
      services: true,
      products: true,
      staffPreference: { select: { name: true } },
      assignedStaff: { select: { name: true } },
      paymentMethod: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings: bookings.map(serializeBooking) });
}
