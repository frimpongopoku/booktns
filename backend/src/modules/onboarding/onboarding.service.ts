import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { normalizePhone } from "../../common/lib/phone";
import { sendVendorWelcomeEmail } from "../../common/lib/email";
import { logger } from "../../common/lib/logger";
import type { StaffRole, ServiceCategory, PaymentMethodType } from "../../types";
import type { CreateOnboardingDto } from "./onboarding.schemas";

// dayOfWeek: 0=Sun..6=Sat. All 7 days default to open — which days (if any)
// a vendor is closed is entirely their call, made afterward in Settings, not
// an assumption baked into onboarding.
const DEFAULT_BUSINESS_HOURS = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isClosed: false,
  openTime: "09:00",
  closeTime: "19:00",
}));

// Prisma's P2002 metadata shape differs between the classic query engine
// (`meta.target`, an array of column names) and the driver-adapter path
// used here — verified live against a real duplicate-slug conflict, which
// carries `meta.driverAdapterError.cause.constraint.index` (the Postgres
// constraint NAME, e.g. "Vendor_slug_key") rather than a `fields` array at
// all. Checking both means "slug"/"email" substring matching below works
// against whichever shape actually comes back.
function uniqueConstraintFields(meta: Record<string, unknown> | undefined): string[] {
  if (!meta) return [];
  if (Array.isArray(meta.target)) return meta.target as string[];

  const driverError = meta.driverAdapterError as
    | { cause?: { constraint?: { fields?: string[]; index?: string } } }
    | undefined;
  const constraint = driverError?.cause?.constraint;
  if (constraint?.fields) return constraint.fields;
  if (constraint?.index) return [constraint.index];
  return [];
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOnboardingDto): Promise<{ slug: string }> {
    const { businessInfo, staffList, services, paymentMethods } = dto;

    // Every other backend write path normalizes phone numbers via
    // lib/phone.ts — the original Next.js action didn't, storing the raw
    // string instead. Fixed here rather than carried forward.
    const normalizedPhone = normalizePhone(businessInfo.phone);
    if (!normalizedPhone) {
      throw new BadRequestException({ error: "Enter a valid phone number", code: "invalid_request" });
    }

    // Onboarding's wizard UI can submit blank leftover rows (an empty staff
    // slot never filled in, a service row started then abandoned) — these
    // are dropped here rather than rejected, same as the original action.
    const validStaff = staffList.filter((s) => s.name.trim() && s.email.trim());
    if (validStaff.length === 0) {
      throw new BadRequestException({
        error: "Add at least one staff member with a name and email.",
        code: "invalid_request",
      });
    }
    if (!validStaff.some((s) => s.role === "Owner")) {
      throw new BadRequestException({
        error: "Every business needs an owner — add yourself as the owner to continue.",
        code: "invalid_request",
      });
    }

    const validServices = services.filter((s) => s.name.trim());
    const validPaymentMethods = paymentMethods.filter(
      (pm) => pm.label.trim() && (pm.type === "cash" || (pm.name.trim() && pm.number.trim())),
    );

    try {
      const vendor = await this.prisma.$transaction(async (tx) => {
        const createdVendor = await tx.vendor.create({
          data: {
            name: businessInfo.name,
            slug: businessInfo.slug,
            description: businessInfo.description.trim(),
            location: businessInfo.location.trim(),
            hours: businessInfo.hours.trim(),
            phone: normalizedPhone,
            whatsapp: normalizedPhone,
          },
        });

        await tx.staff.createMany({
          data: validStaff.map((s) => ({
            vendorId: createdVendor.id,
            name: s.name.trim(),
            email: s.email.trim().toLowerCase(),
            role: s.role as StaffRole,
          })),
        });

        await tx.businessHours.createMany({
          data: DEFAULT_BUSINESS_HOURS.map((day) => ({
            vendorId: createdVendor.id,
            ...day,
          })),
        });

        if (validServices.length > 0) {
          await tx.service.createMany({
            data: validServices.map((s, i) => ({
              vendorId: createdVendor.id,
              name: s.name.trim(),
              category: s.category as ServiceCategory,
              durationMinutes: parseInt(s.duration) || 60,
              priceInPesewas: Math.round(parseFloat(s.price) * 100) || 0,
              displayOrder: i,
            })),
          });
        }

        if (validPaymentMethods.length > 0) {
          await tx.paymentMethod.createMany({
            data: validPaymentMethods.map((pm, i) => ({
              vendorId: createdVendor.id,
              type: pm.type as PaymentMethodType,
              label: pm.label.trim(),
              accountName: pm.name.trim() || pm.label.trim(),
              accountNumber: pm.type === "cash" ? null : pm.number.trim(),
              displayOrder: i,
            })),
          });
        }

        return createdVendor;
      });

      // Fire-and-forget, same pattern as every other transactional send in
      // this codebase (see bookings.service.ts) — a flaky Resend call must
      // never fail the onboarding request itself, since the account already
      // exists by this point regardless of whether the email goes out.
      const owner = validStaff.find((s) => s.role === "Owner")!;
      sendVendorWelcomeEmail({
        to: owner.email.trim().toLowerCase(),
        ownerName: owner.name.trim(),
        vendorName: vendor.name,
        vendorSlug: vendor.slug,
      }).catch((err) => logger.error("sendVendorWelcomeEmail failed", { vendorId: vendor.id, err }));

      return { slug: vendor.slug };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = uniqueConstraintFields(err.meta).join(",");
        if (target.includes("slug")) {
          throw new ConflictException({ error: "That storefront URL is already taken. Please choose another.", code: "slug_taken" });
        }
        if (target.includes("email")) {
          throw new ConflictException({
            error: "One of those staff emails is already registered to another account.",
            code: "duplicate_email",
          });
        }
        throw new ConflictException({ error: "Something went wrong creating your account. Please try again.", code: "conflict" });
      }
      throw err;
    }
  }
}
