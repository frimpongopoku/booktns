import { cache } from "react";
import { db } from "@/lib/db";
import { serializeVendor, serializeService, serializeProduct, serializeVendorVideo } from "@/lib/serialize";
import type { Vendor, Service, Product, VendorVideo, PaymentMethod, Staff } from "@/types";

export interface StorefrontVendor extends Vendor {
  services: Service[];
  products: Product[];
  videos: VendorVideo[];
  paymentMethods: PaymentMethod[];
  staff: Staff[];
}

async function fetchStorefrontVendor(where: { slug: string; active: true; storefrontPublished?: true }) {
  const vendor = await db.vendor.findUnique({
    where,
    include: {
      services: { where: { active: true }, orderBy: { displayOrder: "asc" } },
      products: { where: { active: true }, include: { images: true } },
      videos: { orderBy: { displayOrder: "asc" } },
      paymentMethods: { where: { active: true }, orderBy: { displayOrder: "asc" } },
      staff: { where: { active: true } },
    },
  });

  if (!vendor) return null;

  return {
    ...serializeVendor(vendor),
    services: vendor.services.map(serializeService),
    products: vendor.products.map(serializeProduct),
    videos: vendor.videos.map(serializeVendorVideo),
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
}

// A vendor account can be `active` (exists, not suspended) without its
// storefront being publicly visible yet — `storefrontPublished` is the
// vendor's explicit "go live" action (spec §5 step 7), set from Settings.
// This is what the public route, sitemap, and metadata generation use.
export const getStorefrontVendor = cache(async (slug: string): Promise<StorefrontVendor | null> => {
  return fetchStorefrontVendor({ slug, active: true, storefrontPublished: true });
});

// Same data, but skips the publish gate — used only so a vendor's own staff
// can preview the storefront before deciding to publish it. Callers MUST
// verify the requester's session vendorId matches the returned vendor's id
// before rendering this; it is not safe to expose to anonymous requests.
export const getStorefrontVendorForPreview = cache(async (slug: string): Promise<StorefrontVendor | null> => {
  return fetchStorefrontVendor({ slug, active: true });
});

export async function getAllActiveVendorSlugs(): Promise<string[]> {
  const vendors = await db.vendor.findMany({
    where: { active: true, storefrontPublished: true },
    select: { slug: true },
  });
  return vendors.map((v) => v.slug);
}
