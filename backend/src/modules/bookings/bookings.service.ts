import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../../common/lib/prisma-client";
import { Prisma } from "../../generated/prisma/client";
import { normalizePhone } from "../../common/lib/phone";
import { generateBookingSlug, generateDepositReferenceCode } from "../../common/lib/slugs";
import { getAvailableSlots } from "../../common/lib/availability";
import { calculateDepositAmountPesewas } from "../../common/lib/deposit";
import { serializeBooking } from "../../common/lib/serialize";
import { canTransition } from "../../common/lib/bookingStatus";
import { generateConfirmedBookingPdf } from "../../common/lib/pdf";
import { uploadFile } from "../../common/lib/storage";
import {
  sendBookingRequestEmail, sendNewBookingNotification,
  sendBookingConfirmedEmail, sendBookingCancelledEmail, sendBookingCompletedEmail, sendBookingRescheduledEmail,
} from "../../common/lib/email";
import {
  sendBookingRequestSms, sendNewBookingSms,
  sendBookingConfirmedSms, sendBookingCancelledSms, sendBookingCompletedSms, sendBookingRescheduledSms,
} from "../../common/lib/sms";
import { logger } from "../../common/lib/logger";
import { runSerializable, SlotUnavailableError } from "./serializable";
import type { CreateBookingDto, UpdateBookingDto, SelfServiceUpdateDto } from "./bookings.schemas";

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
  // them — scoped in the query, never filtered after the fetch. First view
  // of a new booking marks it seen (CLAUDE.md data rules) — Service staff
  // never trip this, since they can't act on the notification and clearing
  // the badge off their view would hide new bookings from people who can.
  async list(vendorId: string, staffId: string, isServiceStaff: boolean) {
    if (!isServiceStaff) {
      await db.booking.updateMany({ where: { vendorId, seenByVendorAt: null }, data: { seenByVendorAt: new Date() } });
    }

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

  // Owner/Management only (enforced at the controller). Handles status
  // transitions, reassignment, and rescheduling in one PATCH, exactly as the
  // Next.js route it replaces did — including the availability recheck that
  // both reassignment and rescheduling need, atomically with the write.
  async update(vendorId: string, id: string, dto: UpdateBookingDto) {
    const existing = await db.booking.findFirst({
      where: { id, vendorId },
      select: {
        id: true,
        status: true,
        staffPreferenceId: true,
        assignedStaffId: true,
        startTime: true,
        endTime: true,
        vendor: {
          select: {
            name: true, slug: true, location: true, logoUrl: true, phone: true, whatsapp: true,
            personalWhatsappNumber: true, cancellationPolicy: true, storefrontTheme: true,
            ownerName: true, showOwnerName: true, ownerEmail: true, showOwnerEmail: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException({ error: "Booking not found", code: "not_found" });

    if (dto.status && !canTransition(existing.status, dto.status)) {
      throw new ConflictException({ error: "That status change isn't allowed from the current state", code: "invalid_transition" });
    }
    if (dto.status === "no_show" && existing.startTime > new Date()) {
      throw new BadRequestException({ error: "Can't mark no-show before the appointment time", code: "not_yet_due" });
    }

    if (dto.assignedStaffId) {
      const staff = await db.staff.findFirst({ where: { id: dto.assignedStaffId, vendorId, active: true }, select: { id: true } });
      if (!staff) throw new BadRequestException({ error: "Staff member not found", code: "not_found" });
    }

    const willChangeTime = Boolean(dto.startTime && dto.endTime);
    const nextAssignedStaffId = dto.assignedStaffId !== undefined ? dto.assignedStaffId : existing.assignedStaffId;
    const willChangeStaff = nextAssignedStaffId !== null && nextAssignedStaffId !== existing.assignedStaffId;

    let booking;
    try {
      booking = await runSerializable(async (tx) => {
        // Reschedule and staff (re)assignment both change what occupies this
        // booking's slot — re-check availability, atomically with the update,
        // whenever either is changing. Without this, assigning staff had no
        // check at all and could silently double-book a stylist.
        if (willChangeTime || willChangeStaff) {
          const newStart = dto.startTime ? new Date(dto.startTime) : existing.startTime;
          const newEnd = dto.endTime ? new Date(dto.endTime) : existing.endTime;
          const durationMinutes = Math.round((newEnd.getTime() - newStart.getTime()) / 60_000);
          const date = newStart.toISOString().slice(0, 10);
          const time = newStart.toISOString().slice(11, 16);
          const staffId = willChangeStaff ? nextAssignedStaffId! : (existing.assignedStaffId ?? existing.staffPreferenceId ?? undefined);

          const slots = await getAvailableSlots({
            vendorId, date, durationMinutes, staffId: staffId ?? undefined, excludeBookingId: id, client: tx,
          });
          if (!slots.includes(time)) throw new SlotUnavailableError();
        }

        return tx.booking.update({
          where: { id },
          data: {
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.assignedStaffId !== undefined ? { assignedStaffId: dto.assignedStaffId || null } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
            ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
            ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
          },
          include: {
            services: true,
            products: { include: { product: { select: { slug: true } } } },
            staffPreference: { select: { name: true } },
            assignedStaff: { select: { name: true } },
            paymentMethod: true,
          },
        });
      });
    } catch (err) {
      if (err instanceof SlotUnavailableError) {
        throw new ConflictException({ error: "That time is no longer available — please pick another slot", code: "slot_unavailable" });
      }
      throw err;
    }

    const serialized = serializeBooking(booking);
    const vendorInfo = { ...existing.vendor, ownerEmail: existing.vendor.showOwnerEmail ? existing.vendor.ownerEmail : null };
    const newStatus = dto.status;

    // Every notification is gated on an actual status transition — editing
    // notes, assigning staff, or re-submitting the same status never fires
    // anything. No after()-style deferral needed here: this is a long-lived
    // Nest process, not a serverless function that can be frozen the instant
    // the response returns — but still fire-and-forget (not awaited by the
    // caller) so a slow provider never delays the PATCH response.
    if (newStatus && existing.status !== newStatus) {
      void this.notifyStatusChange(newStatus, id, vendorId, booking.slug, serialized, vendorInfo);
    }

    return { booking: serialized };
  }

  // Public, unauthenticated — a guest's only "credential" is the unguessable
  // booking slug itself. Lets a customer edit their own details or cancel,
  // but only while the booking is still pending; once the vendor confirms,
  // both actions lock and the customer is directed to contact the vendor.
  async selfServiceUpdate(slug: string, dto: SelfServiceUpdateDto) {
    const existing = await db.booking.findUnique({ where: { slug }, select: { id: true, status: true } });
    if (!existing) throw new NotFoundException({ error: "Booking not found", code: "not_found" });

    if (existing.status !== "pending") {
      throw new ForbiddenException({ error: "This booking can no longer be changed — please contact the vendor directly.", code: "locked" });
    }

    let normalizedPhone: string | undefined;
    if (dto.customerPhone !== undefined) {
      const result = normalizePhone(dto.customerPhone);
      if (!result) throw new BadRequestException({ error: "Enter a valid phone number", code: "invalid_request" });
      normalizedPhone = result;
    }

    const booking = await db.booking.update({
      where: { id: existing.id },
      data: {
        ...(dto.customerName !== undefined ? { customerName: dto.customerName } : {}),
        ...(normalizedPhone !== undefined ? { customerPhone: normalizedPhone } : {}),
        ...(dto.customerEmail !== undefined ? { customerEmail: dto.customerEmail } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        services: true,
        products: { include: { product: { select: { slug: true } } } },
        staffPreference: { select: { name: true } },
        assignedStaff: { select: { name: true } },
        paymentMethod: true,
        vendor: {
          select: {
            name: true, slug: true, location: true, logoUrl: true, phone: true, whatsapp: true,
            personalWhatsappNumber: true, cancellationPolicy: true, ownerEmail: true, showOwnerEmail: true,
          },
        },
      },
    });

    const serialized = serializeBooking(booking);

    // Only reachable transition here is pending -> cancelled (the guard
    // above rejects any request once status isn't "pending", and status can
    // only ever be the literal "cancelled") — a plain self-service edit
    // never fires anything. Fire-and-forget: a slow mail provider must not
    // fail an otherwise-successful cancellation.
    if (dto.status === "cancelled") {
      const vendorInfo = { ...booking.vendor, ownerEmail: booking.vendor.showOwnerEmail ? booking.vendor.ownerEmail : null };
      Promise.all([
        sendBookingCancelledEmail(serialized, vendorInfo).catch((err) => logger.error("sendBookingCancelledEmail failed", { bookingId: booking.id, vendorId: booking.vendorId, err })),
        sendBookingCancelledSms(serialized, booking.vendor).catch((err) => logger.error("sendBookingCancelledSms failed", { bookingId: booking.id, vendorId: booking.vendorId, err })),
      ]).catch(() => undefined);
    }

    return { booking: serialized };
  }

  private async notifyStatusChange(
    newStatus: string,
    id: string,
    vendorId: string,
    bookingSlug: string,
    serialized: ReturnType<typeof serializeBooking>,
    vendorInfo: {
      name: string; slug: string; location: string; logoUrl: string | null; phone: string; whatsapp: string;
      personalWhatsappNumber: string | null; cancellationPolicy: string | null; storefrontTheme: import("../../generated/prisma/client").StorefrontTheme;
      ownerName: string | null; showOwnerName: boolean; ownerEmail: string | null;
    },
  ): Promise<void> {
    try {
      if (newStatus === "confirmed") {
        await Promise.all([
          sendBookingConfirmedEmail(serialized, vendorInfo).catch((err) => logger.error("sendBookingConfirmedEmail failed", { bookingId: id, vendorId, err })),
          sendBookingConfirmedSms(serialized, vendorInfo).catch((err) => logger.error("sendBookingConfirmedSms failed", { bookingId: id, vendorId, err })),
        ]);
        // PDF generation (Satori render + resvg rasterize) and the R2 upload
        // take multiple seconds and nothing in the PATCH response depends on
        // the result — the customer's booking page and the dashboard's
        // booking drawer both read confirmedPdfUrl independently once set.
        try {
          const pdfBuffer = await generateConfirmedBookingPdf(serialized, vendorInfo);
          const confirmedPdfUrl = await uploadFile(`bookings/${bookingSlug}/confirmed.pdf`, pdfBuffer, "application/pdf");
          await db.booking.update({ where: { id }, data: { confirmedPdfUrl } });
        } catch (err) {
          logger.error("generateConfirmedBookingPdf failed", { bookingId: id, vendorId, err });
        }
      } else if (newStatus === "cancelled") {
        await Promise.all([
          sendBookingCancelledEmail(serialized, vendorInfo).catch((err) => logger.error("sendBookingCancelledEmail failed", { bookingId: id, vendorId, err })),
          sendBookingCancelledSms(serialized, vendorInfo).catch((err) => logger.error("sendBookingCancelledSms failed", { bookingId: id, vendorId, err })),
        ]);
      } else if (newStatus === "completed") {
        await Promise.all([
          sendBookingCompletedEmail(serialized, vendorInfo).catch((err) => logger.error("sendBookingCompletedEmail failed", { bookingId: id, vendorId, err })),
          sendBookingCompletedSms(serialized, vendorInfo).catch((err) => logger.error("sendBookingCompletedSms failed", { bookingId: id, vendorId, err })),
        ]);
      } else if (newStatus === "rescheduled") {
        await Promise.all([
          sendBookingRescheduledEmail(serialized, vendorInfo).catch((err) => logger.error("sendBookingRescheduledEmail failed", { bookingId: id, vendorId, err })),
          sendBookingRescheduledSms(serialized, vendorInfo).catch((err) => logger.error("sendBookingRescheduledSms failed", { bookingId: id, vendorId, err })),
        ]);
      }
      // "no_show" is deliberately silent — a vendor-internal record, not
      // something we tell the customer about after the fact.
    } catch (err) {
      logger.error("notifyStatusChange failed", { bookingId: id, vendorId, newStatus, err });
    }
  }
}
