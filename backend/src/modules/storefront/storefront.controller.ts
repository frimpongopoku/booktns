import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { Public } from "../../common/decorators";
import {
  getStorefrontVendor, getVendorPublicMeta, getAllActiveVendorSlugs, getVendorSlugByCustomDomain,
  getAllActiveProductSlugs, getVendorIconLogoUrl,
} from "../../common/lib/vendors";
import { getBookingBySlug } from "../../common/lib/bookings";
import { getOrderBySlug } from "../../common/lib/orders";

// The public read surface. This module did not exist in the Next.js app —
// there was nothing to expose, because the storefront pages queried Prisma
// directly inside server components. Splitting the backend out is what makes
// it necessary: those pages now need JSON.
//
// Everything here is unauthenticated by design. It returns exactly what a
// shopper could already see rendered as HTML, and nothing more — owner
// contact fields are still filtered by their show* flags inside
// getStorefrontVendor, so a hidden phone number is dropped before it
// reaches this layer.
@Public()
@Controller("storefront")
export class StorefrontController {
  @Get("slugs")
  async slugs() {
    // Feeds generateStaticParams and sitemap.ts on the frontend.
    return { slugs: await getAllActiveVendorSlugs() };
  }

  // Registered before the :slug route below — a literal segment, so route
  // order isn't strictly load-bearing here, but kept first anyway so the
  // relationship to "slugs" above reads clearly (same convention as
  // ProductsController.lowStock in catalog.controller.ts).
  @Get("product-slugs")
  async productSlugs() {
    // Feeds app/sitemap.ts's per-vendor product pages.
    return { slugs: await getAllActiveProductSlugs() };
  }

  // Middleware calls this to map a Host header to a vendor. Kept separate
  // from the full vendor read because it runs on a large share of requests
  // and only needs one column.
  @Get("resolve-domain")
  async resolveDomain(@Query("host") host: string) {
    if (!host) return { slug: null };
    return { slug: await getVendorSlugByCustomDomain(host) };
  }

  @Get(":slug")
  async vendor(@Param("slug") slug: string) {
    const vendor = await getStorefrontVendor(slug);
    if (vendor) return { vendor, published: true };

    // A vendor that exists but hasn't published yet is a real resource in a
    // not-yet-available state — the frontend renders "coming soon" for it and
    // a true 404 only for an unknown slug, so the two must stay
    // distinguishable here.
    const meta = await getVendorPublicMeta(slug);
    if (!meta) throw new NotFoundException({ error: "Shop not found", code: "not_found" });
    return { vendor: null, published: false, meta };
  }

  // Staff-only preview of an unpublished storefront. NOT exposed here: it
  // requires a session whose vendorId matches, so it lives on the
  // authenticated /vendor route instead. Putting it under @Public() would
  // hand anonymous callers every unpublished shop's catalogue.

  // Just the logo, for the per-vendor favicon routes (app/[slug]/icon.tsx
  // and apple-icon.tsx) — a browser asks for these on every single page
  // load, so this deliberately does NOT reuse the full vendor() handler
  // above, which pulls every service/product/video/staff/hours row.
  @Get(":slug/icon")
  async icon(@Param("slug") slug: string) {
    return { logoUrl: await getVendorIconLogoUrl(slug) };
  }

  @Get("booking/:bookingSlug")
  async booking(@Param("bookingSlug") bookingSlug: string) {
    const booking = await getBookingBySlug(bookingSlug);
    if (!booking) throw new NotFoundException({ error: "Booking not found", code: "not_found" });
    return { booking };
  }

  @Get("order/:orderSlug")
  async order(@Param("orderSlug") orderSlug: string) {
    const order = await getOrderBySlug(orderSlug);
    if (!order) throw new NotFoundException({ error: "Order not found", code: "not_found" });
    return { order };
  }
}
