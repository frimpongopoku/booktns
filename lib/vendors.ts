import { cache } from "react";
import { db } from "@/lib/db";
import { serializeService, serializeProduct } from "@/lib/serialize";
import type { Vendor, Service, Product, VendorVideo, PaymentMethod, Staff } from "@/types";

export interface StorefrontVendor extends Vendor {
  services: Service[];
  products: Product[];
  videos: VendorVideo[];
  paymentMethods: PaymentMethod[];
  staff: Staff[];
}

export const getStorefrontVendor = cache(async (slug: string): Promise<StorefrontVendor | null> => {
  const vendor = await db.vendor.findUnique({
    where: { slug, active: true },
    include: {
      services: { where: { active: true }, orderBy: { displayOrder: "asc" } },
      products: { where: { active: true }, include: { images: true } },
      videos: true,
      paymentMethods: { where: { active: true }, orderBy: { displayOrder: "asc" } },
      staff: { where: { active: true } },
    },
  });

  if (!vendor) return null;

  return {
    ...vendor,
    createdAt: vendor.createdAt.toISOString(),
    coverColor: vendor.coverColor ?? undefined,
    services: vendor.services.map(serializeService),
    products: vendor.products.map(serializeProduct),
    videos: vendor.videos.map((v) => ({
      ...v,
      description: v.description ?? undefined,
      url: v.url ?? undefined,
    })),
    paymentMethods: vendor.paymentMethods.map((pm) => ({
      ...pm,
      accountNumber: pm.accountNumber ?? undefined,
      bankName: pm.bankName ?? undefined,
      network: pm.network ?? undefined,
    })),
    staff: vendor.staff.map((s) => ({
      ...s,
      phone: s.phone ?? undefined,
      roleDetail: s.roleDetail ?? undefined,
    })),
  };
});

export async function getAllActiveVendorSlugs(): Promise<string[]> {
  const vendors = await db.vendor.findMany({
    where: { active: true },
    select: { slug: true },
  });
  return vendors.map((v) => v.slug);
}
