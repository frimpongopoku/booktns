import { cache } from "react";
import { db } from "@/lib/db";
import { serializeVendor, serializeService, serializeProduct, serializeVendorVideo } from "@/lib/serialize";
import type { Vendor, Service, Product, VendorVideo, PaymentMethod, Staff, BusinessHours } from "@/types";

export interface StorefrontVendor extends Vendor {
  services: Service[];
  products: Product[];
  videos: VendorVideo[];
  paymentMethods: PaymentMethod[];
  staff: Staff[];
  businessHours: BusinessHours[];
}

// The owner's name/phone/email each carry their own show* flag. A field the
// vendor chose not to publish is dropped here, at the single boundary where
// vendor data becomes storefront data — not at each render site. Anything
// returned from this module is serialized into the RSC payload and reaches
// the browser whether a component renders it or not, so "just don't display
// it" would still ship a private phone number to every visitor.
function redactHiddenOwnerDetails(vendor: Vendor): Vendor {
  return {
    ...vendor,
    ownerName: vendor.showOwnerName ? vendor.ownerName : undefined,
    ownerPhone: vendor.showOwnerPhone ? vendor.ownerPhone : undefined,
    ownerEmail: vendor.showOwnerEmail ? vendor.ownerEmail : undefined,
  };
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
      businessHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!vendor) return null;

  return {
    ...redactHiddenOwnerDetails(serializeVendor(vendor)),
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
    businessHours: vendor.businessHours,
  };
}

// A vendor account can be `active` (exists, not suspended) without its
// storefront being publicly visible yet — `storefrontPublished` is the
// vendor's explicit "go live" action (spec §5 step 7), set from Settings.
// This is what the public route, sitemap, and metadata generation use.
export const getStorefrontVendor = cache(async (slug: string): Promise<StorefrontVendor | null> => {
  const vendor = await fetchStorefrontVendor({ slug, active: true, storefrontPublished: true });
  // A suspended vendor's storefront is not served at all. Handled here rather
  // than in the Prisma `where` so callers can still distinguish "no such shop"
  // from "suspended" via getVendorPublicMeta below.
  if (vendor?.suspended) return null;
  return vendor;
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
    where: { active: true, storefrontPublished: true, suspended: false },
    select: { slug: true },
  });
  return vendors.map((v) => v.slug);
}

export interface VendorProductSlugPair {
  vendorSlug: string;
  productSlug: string;
}

// Used by app/sitemap.ts to list every indexable product page.
export async function getAllActiveProductSlugs(): Promise<VendorProductSlugPair[]> {
  const vendors = await db.vendor.findMany({
    where: { active: true, storefrontPublished: true, suspended: false },
    select: { slug: true, products: { where: { active: true }, select: { slug: true } } },
  });
  return vendors.flatMap((v) => v.products.map((p) => ({ vendorSlug: v.slug, productSlug: p.slug })));
}

export interface VendorPublicMeta {
  name: string;
  published: boolean;
  suspended: boolean;
}

// Lightweight lookup for the "shop not found" vs "shop exists but isn't
// published yet" distinction on the public storefront's not-found states —
// deliberately returns only the name, nothing else, since an unpublished
// vendor's real data (services/products/etc.) shouldn't be exposed to
// anonymous visitors. An inactive (suspended) vendor is treated the same as
// nonexistent — surfacing "coming soon" for a disabled account would be
// misleading.
export const getVendorPublicMeta = cache(async (slug: string): Promise<VendorPublicMeta | null> => {
  const vendor = await db.vendor.findUnique({
    where: { slug, active: true },
    select: { name: true, storefrontPublished: true, suspended: true },
  });
  if (!vendor) return null;
  return { name: vendor.name, published: vendor.storefrontPublished, suspended: vendor.suspended };
});

// Middleware-only lookup: resolves a request Host header to a vendor slug.
// Deliberately NOT wrapped in React's cache() like its siblings above —
// cache() dedupes within a single request's React render tree, and
// middleware executes outside that tree entirely (before the request ever
// reaches route/RSC rendering). Wrapping it would rely on undefined
// behavior — at best a no-op, at worst a stale value silently persisting
// across unrelated requests in the middleware's long-lived process, which
// would directly defeat the "always re-check live state" rule this feature
// depends on. Call Prisma directly.
export async function getVendorSlugByCustomDomain(host: string): Promise<string | null> {
  const vendor = await db.vendor.findFirst({
    where: { customDomain: host, customDomainVerified: true, active: true, storefrontPublished: true, suspended: false },
    select: { slug: true },
  });
  return vendor?.slug ?? null;
}

// Just the logo, for the per-vendor favicon routes (app/[slug]/icon.tsx and
// apple-icon.tsx). Deliberately NOT getStorefrontVendor: that pulls every
// service, product, video, payment method, staff row and business-hours row,
// and a browser asks for a favicon on every single page load.
//
// Gated on the same published/active/suspended conditions as the storefront
// itself, so an unpublished shop's branding isn't served from a URL that
// needs no session.
export const getVendorIconLogoUrl = cache(async (slug: string): Promise<string | null> => {
  const vendor = await db.vendor.findUnique({
    where: { slug, active: true, storefrontPublished: true },
    select: { logoUrl: true, suspended: true },
  });
  if (!vendor || vendor.suspended) return null;
  return vendor.logoUrl;
});
