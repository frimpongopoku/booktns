import { cache } from "react";
import { apiPublic, apiPublicOrNull, ApiError } from "@/lib/api-client";
import { apiServer } from "@/lib/api-client.server";
import type { Vendor, Service, Product, VendorVideo, PaymentMethod, Staff, BusinessHours } from "@/types";

export interface StorefrontVendor extends Vendor {
  services: Service[];
  products: Product[];
  videos: VendorVideo[];
  paymentMethods: PaymentMethod[];
  staff: Staff[];
  businessHours: BusinessHours[];
}

export interface VendorPublicMeta {
  name: string;
  published: boolean;
  suspended: boolean;
}

interface StorefrontEnvelope {
  vendor: StorefrontVendor | null;
  published: boolean;
  meta?: VendorPublicMeta;
}

// One fetch of the backend's GET /storefront/:slug, shared by both
// getStorefrontVendor and getVendorPublicMeta below — the backend already
// returns {vendor, published, meta} in a single payload, so there's no
// reason for two round trips just because this file used to be two
// separate Prisma queries. cache()-wrapped so a page.tsx + layout.tsx pair
// rendering the same request only ever fetches once.
const fetchStorefrontEnvelope = cache(async (slug: string): Promise<StorefrontEnvelope | null> => {
  return apiPublicOrNull<StorefrontEnvelope>(`/storefront/${slug}`);
});

// A vendor account can be `active` (exists, not suspended) without its
// storefront being publicly visible yet — `storefrontPublished` is the
// vendor's explicit "go live" action (spec §5 step 7), set from Settings.
// This is what the public route, sitemap, and metadata generation use.
// Suspended vendors are already excluded backend-side (getStorefrontVendor
// in backend/src/common/lib/vendors.ts returns null for them).
export const getStorefrontVendor = cache(async (slug: string): Promise<StorefrontVendor | null> => {
  const envelope = await fetchStorefrontEnvelope(slug);
  if (!envelope || !envelope.published) return null;
  return envelope.vendor;
});

// Same data, but skips the publish gate — used only so a vendor's own staff
// can preview the storefront before deciding to publish it. The backend
// endpoint itself verifies the caller's session vendorId matches (see
// backend/src/modules/vendor/vendor.controller.ts's storefront-preview
// route) — it 404s otherwise, so this can never leak another vendor's
// unpublished catalogue even if a caller forgot to check.
export const getStorefrontVendorForPreview = cache(async (slug: string): Promise<StorefrontVendor | null> => {
  try {
    const { vendor } = await apiServer<{ vendor: StorefrontVendor }>(`/vendor/storefront-preview/${slug}`);
    return vendor;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
});

export async function getAllActiveVendorSlugs(): Promise<string[]> {
  const { slugs } = await apiPublic<{ slugs: string[] }>("/storefront/slugs");
  return slugs;
}

export interface VendorProductSlugPair {
  vendorSlug: string;
  productSlug: string;
}

// Used by app/sitemap.ts to list every indexable product page.
export async function getAllActiveProductSlugs(): Promise<VendorProductSlugPair[]> {
  const { slugs } = await apiPublic<{ slugs: VendorProductSlugPair[] }>("/storefront/product-slugs");
  return slugs;
}

// Lightweight lookup for the "shop not found" vs "shop exists but isn't
// published yet" distinction on the public storefront's not-found states —
// deliberately returns only the name, nothing else, since an unpublished
// vendor's real data (services/products/etc.) shouldn't be exposed to
// anonymous visitors. An inactive (suspended) vendor is treated the same as
// nonexistent — surfacing "coming soon" for a disabled account would be
// misleading. Shares the same envelope fetch as getStorefrontVendor above.
export const getVendorPublicMeta = cache(async (slug: string): Promise<VendorPublicMeta | null> => {
  const envelope = await fetchStorefrontEnvelope(slug);
  if (!envelope) return null;
  if (envelope.published) return { name: envelope.vendor!.name, published: true, suspended: false };
  return envelope.meta ?? null;
});

// Middleware-only lookup: resolves a request Host header to a vendor slug.
// Deliberately NOT wrapped in React's cache() like its siblings above —
// cache() dedupes within a single request's React render tree, and
// middleware executes outside that tree entirely (before the request ever
// reaches route/RSC rendering). Wrapping it would rely on undefined
// behavior — at best a no-op, at worst a stale value silently persisting
// across unrelated requests in the middleware's long-lived process, which
// would directly defeat the "always re-check live state" rule this feature
// depends on.
export async function getVendorSlugByCustomDomain(host: string): Promise<string | null> {
  const { slug } = await apiPublic<{ slug: string | null }>(`/storefront/resolve-domain?host=${encodeURIComponent(host)}`);
  return slug;
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
  const { logoUrl } = await apiPublic<{ logoUrl: string | null }>(`/storefront/${slug}/icon`);
  return logoUrl;
});
