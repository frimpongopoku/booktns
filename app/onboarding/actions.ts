"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { StaffRole, ServiceCategory, PaymentMethodType } from "@/types";

interface BusinessInfoInput {
  name: string;
  slug: string;
  description: string;
  location: string;
  hours: string;
  phone: string;
}

interface StaffInput {
  name: string;
  email: string;
  role: string;
}

interface ServiceInput {
  name: string;
  duration: string;
  price: string;
  category: string;
}

interface PaymentMethodInput {
  type: string;
  label: string;
  number: string;
  name: string;
}

interface OnboardingInput {
  businessInfo: BusinessInfoInput;
  staffList: StaffInput[];
  services: ServiceInput[];
  paymentMethods: PaymentMethodInput[];
}

type OnboardingResult = { ok: true; slug: string } | { ok: false; error: string };

// dayOfWeek: 0=Sun..6=Sat. Default matches the dummy-data vendor's prior
// free-text hours ("Mon–Sat 9am–7pm") so onboarding doesn't regress the look
// of a freshly created storefront before the owner customises it.
const DEFAULT_BUSINESS_HOURS = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) =>
  dayOfWeek === 0
    ? { dayOfWeek, isClosed: true, openTime: null, closeTime: null }
    : { dayOfWeek, isClosed: false, openTime: "09:00", closeTime: "19:00" }
);

// Prisma's P2002 metadata shape differs between the classic query engine
// (`meta.target`) and the driver-adapter path used here (`meta.driverAdapterError...constraint.fields`).
function uniqueConstraintFields(meta: Record<string, unknown> | undefined): string[] {
  if (!meta) return [];
  if (Array.isArray(meta.target)) return meta.target as string[];

  const driverError = meta.driverAdapterError as
    | { cause?: { constraint?: { fields?: string[] } } }
    | undefined;
  return driverError?.cause?.constraint?.fields ?? [];
}

export async function createVendorFromOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const { businessInfo, staffList, services, paymentMethods } = input;

  const name = businessInfo.name.trim();
  const slug = businessInfo.slug.trim();
  if (!name || !slug) {
    return { ok: false, error: "Business name and storefront URL are required." };
  }

  const validStaff = staffList.filter((s) => s.name.trim() && s.email.trim());
  if (validStaff.length === 0) {
    return { ok: false, error: "Add at least one staff member with a name and email." };
  }
  if (!validStaff.some((s) => s.role === "Owner")) {
    return { ok: false, error: "Every business needs an owner — add yourself as the owner to continue." };
  }

  const validServices = services.filter((s) => s.name.trim());

  const validPaymentMethods = paymentMethods.filter(
    (pm) => pm.label.trim() && (pm.type === "cash" || (pm.name.trim() && pm.number.trim()))
  );

  try {
    const vendor = await db.$transaction(async (tx) => {
      const createdVendor = await tx.vendor.create({
        data: {
          name,
          slug,
          description: businessInfo.description.trim(),
          location: businessInfo.location.trim(),
          hours: businessInfo.hours.trim(),
          phone: businessInfo.phone.trim(),
          whatsapp: businessInfo.phone.trim(),
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

    return { ok: true, slug: vendor.slug };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = uniqueConstraintFields(err.meta).join(",");
      if (target.includes("slug")) {
        return { ok: false, error: "That storefront URL is already taken. Please choose another." };
      }
      if (target.includes("email")) {
        return { ok: false, error: "One of those staff emails is already registered to another account." };
      }
      return { ok: false, error: "Something went wrong creating your account. Please try again." };
    }
    return { ok: false, error: "Something went wrong creating your account. Please try again." };
  }
}
