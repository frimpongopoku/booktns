"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { StaffRole } from "@/types";

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

interface OnboardingInput {
  businessInfo: BusinessInfoInput;
  staffList: StaffInput[];
}

type OnboardingResult = { ok: true; slug: string } | { ok: false; error: string };

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
  const { businessInfo, staffList } = input;

  const name = businessInfo.name.trim();
  const slug = businessInfo.slug.trim();
  if (!name || !slug) {
    return { ok: false, error: "Business name and storefront URL are required." };
  }

  const validStaff = staffList.filter((s) => s.name.trim() && s.email.trim());
  if (validStaff.length === 0) {
    return { ok: false, error: "Add at least one staff member with a name and email." };
  }

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
