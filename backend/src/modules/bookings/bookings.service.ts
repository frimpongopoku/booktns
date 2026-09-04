import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { db } from "../../common/lib/prisma-client";
import { Prisma } from "../../generated/prisma/client";
import { normalizePhone } from "../../common/lib/phone";
import { generateBookingSlug, generateDepositReferenceCode } from "../../common/lib/slugs";
import { getAvailableSlots } from "../../common/lib/availability";
import { calculateDepositAmountPesewas } from "../../common/lib/deposit";
import { serializeBooking } from "../../common/lib/serialize";
import { sendBookingRequestEmail, sendNewBookingNotification } from "../../common/lib/email";
import { sendBookingRequestSms, sendNewBookingSms } from "../../common/lib/sms";
import { logger } from "../../common/lib/logger";
import { runSerializable, SlotUnavailableError } from "./serializable";
import type { CreateBookingDto } from "./bookings.schemas";

const MAX_SLUG_ATTEMPTS = 5;

@Injectable()
export class BookingsService {
  // Guest booking — unauthenticated, same trust model as order creation.
  async create(dto: CreateBookingDto) {
    const vendor = await db.vendor.findUnique({
      where: { slug: dto.vendorSlug },
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
      throw new BadRequestException({ error: "Shop not found", code: "not_found" });
    }

    const requestedProducts = dto.products ?? [];

    // None of these five lookups depend on each other's results — fetch
    // concurrently rather than as five sequential round trips.
    const [services, products, staffMatch, paymentMethodMatch, notifyStaff] = await Promise.all([
      db.service.findMany({ where: { id: { in: dto.serviceIds }, vendorId: vendor.id, active: true } }),
      requestedProducts.length > 0
        ? db.product.findMany({
            where: { id: { in: requestedProducts.map((p) => p.productId) }, vendorId: vendor.id, active: true },
          })
        : Promise.resolve([]),
      dto.staffPreferenceId
        ? db.staff.findFirst({ where: { id: dto.staffPreferenceId, vendorId: vendor.id, active: true }, select: { id: true } })
        : Promise.resolve(null),
      dto.paymentMethodId
        ? db.paymentMethod.findFirst({ where: { id: dto.paymentMethodId, vendorId: vendor.id, active: true }, select: { id: true } })
        : Promise.resolve(null),
      db.staff.findMany({
        where: { vendorId: vendor.id, role: { in: ["Owner", "Management"] }, active: true },
        select: { email: true, phone: true },
      }),
    ]);

    if (services.length !== new Set(dto.serviceIds).size) {
      throw new BadRequestException({
        error: "One or more selected services are no longer available",
        code: "invalid_request",
      });
    }

    const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalServicePesewas = services.reduce((sum, s) => sum + s.priceInPesewas, 0);

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of requestedProducts) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException({
          error: "One or more flagged products are no longer available",
          code: "invalid_request",
        });
      }
      if (item.quantity > product.stockCount) {
        throw new BadRequestException({
          error: `Only ${product.stockCount} of "${product.name}" left in stock`,
          code: "invalid_request",
        });
      }
    }

    if (dto.staffPreferenceId && !staffMatch) {
      throw new BadRequestException({ error: "Staff member not found", code: "not_found" });
    }
    if (dto.paymentMethodId && !paymentMethodMatch) {
      throw new BadRequestException({ error: "Payment method not found", code: "not_found" });
    }

    // Cheap fail-fast check, outside any transaction — catches the common,
    // non-racing case (slot was simply taken a while ago) before doing the
    // rest of this request's work. Not the correctness guarantee; that's the
    // recheck inside the transaction below.
    const availableSlots = await getAvailableSlots({
      vendorId: vendor.id,
      date: dto.date,
      durationMinutes: totalDurationMinutes,
      staffId: dto.staffPreferenceId ?? undefined,
    });
    if (!availableSlots.includes(dto.startTime)) {
      throw new ConflictException({
        error: "That time is no longer available — please pick another slot",
        code: "slot_unavailable",
      });
    }

    const normalizedPhone = normalizePhone(dto.customerPhone);
    if (!normalizedPhone) {
      throw new BadRequestException({ error: "Enter a valid phone number", code: "invalid_request" });
    }

    const [year, month, day] = dto.date.split("-").map(Number);
    const [startHour, startMinute] = dto.startTime.split(":").map(Number);
    const startTime = new Date(Date.UTC(year, month - 1, day, startHour, startMinute));
    const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60_000);

    const depositAmountPesewas = calculateDepositAmountPesewas(
      vendor.depositSetting,
      vendor.depositValue,
      totalServicePesewas,
    );

    // price_at_booking / price_snapshot are mandatory (CLAUDE.md § Data
    // Rules): they preserve what the customer was charged regardless of any
    // future price change.
    const bookingServices = services.map((s) => ({
      serviceId: s.id,
      name: s.name,
      priceAtBooking: s.priceInPesewas,
      durationMinutes: s.durationMinutes,
    }));
    const bookingProducts = requestedProducts.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        productId: product.id,
        name: product.name,
        priceAtBooking: product.priceInPesewas,
        quantity: item.quantity,
      };
    });

    let booking;
    try {
      booking = await runSerializable(async (tx) => {
        // Authoritative recheck, atomic with the create below — this is what
        // actually closes the race between two customers submitting the same
        // slot at once, not the fail-fast check above.
        const slots = await getAvailableSlots({
          vendorId: vendor.id,
          date: dto.date,
          durationMinutes: totalDurationMinutes,
          staffId: dto.staffPreferenceId ?? undefined,
          client: tx,
        });
        if (!slots.includes(dto.startTime)) throw new SlotUnavailableError();

        for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
          try {
            return await tx.booking.create({
              data: {
                vendorId: vendor.id,
                slug: generateBookingSlug(),
                customerName: dto.customerName,
                customerPhone: normalizedPhone,
                customerEmail: dto.customerEmail,
                staffPreferenceId: dto.staffPreferenceId || null,
                startTime,
                endTime,
                notes: dto.notes ?? "",
                depositAmountPesewas,
                depositReferenceCode: depositAmountPesewas > 0 ? generateDepositReferenceCode() : null,
                paymentMethodId: dto.paymentMethodId || null,
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
        throw new ConflictException({
          error: "That time is no longer available — please pick another slot",
          code: "slot_unavailable",
        });
      }
      throw err;
    }

    const serialized = serializeBooking(booking);
    const vendorInfo = {
      name: vendor.name,
      slug: dto.vendorSlug,
      logoUrl: vendor.logoUrl,
      location: vendor.location,
      phone: vendor.phone,
      whatsapp: vendor.whatsapp,
      personalWhatsappNumber: vendor.personalWhatsappNumber,
      cancellationPolicy: vendor.cancellationPolicy,
      // Only if the vendor publishes it — same gate the storefront applies.
      ownerEmail: vendor.showOwnerEmail ? vendor.ownerEmail : null,
    };
    const notifyStaffPhones = notifyStaff.map((s) => s.phone).filter((p): p is string => Boolean(p));

    // Awaited as a group rather than left as floating promises. On a
    // long-lived Nest server this is less fragile than it was on serverless,
    // but it still matters: an unawaited rejection here becomes an
    // unhandled rejection that can take the process down. A slow provider
    // must not fail an otherwise-successful booking, hence the per-send
    // .catch().
    await Promise.all([
      sendBookingRequestEmail(serialized, vendorInfo).catch((err) =>
        logger.error("sendBookingRequestEmail failed", { bookingId: serialized.id, vendorId: vendor.id, err }),
      ),
      sendNewBookingNotification(serialized, vendorInfo, notifyStaff.map((s) => s.email)).catch((err) =>
        logger.error("sendNewBookingNotification failed", { bookingId: serialized.id, vendorId: vendor.id, err }),
      ),
      sendBookingRequestSms(serialized, vendorInfo).catch((err) =>
        logger.error("sendBookingRequestSms failed", { bookingId: serialized.id, vendorId: vendor.id, err }),
      ),
      sendNewBookingSms(serialized, notifyStaffPhones).catch((err) =>
        logger.error("sendNewBookingSms failed", { bookingId: serialized.id, vendorId: vendor.id, err }),
      ),
    ]);

    return { booking: serialized };
  }

  // Vendor-scoped list. Service staff receive only the bookings assigned to
  // them — scoped in the query, never filtered after the fetch.
  async list(vendorId: string, staffId: string, isServiceStaff: boolean) {
    const bookings = await db.booking.findMany({
      where: {
        vendorId,
        ...(isServiceStaff
          ? { OR: [{ assignedStaffId: staffId }, { staffPreferenceId: staffId }] }
          : {}),
      },
      include: {
        services: true,
        products: { include: { product: { select: { slug: true } } } },
        staffPreference: { select: { name: true } },
        assignedStaff: { select: { name: true } },
        paymentMethod: true,
      },
      orderBy: { startTime: "desc" },
    });
    return { bookings: bookings.map(serializeBooking) };
  }
}
