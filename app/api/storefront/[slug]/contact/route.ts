import { NextResponse } from "next/server";
import { getStorefrontVendor, getStorefrontVendorForPreview } from "@/lib/vendors";
import { getSession } from "@/lib/auth";
import { getBookingBySlug } from "@/lib/bookings";
import { getOrderBySlug } from "@/lib/orders";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// Raw phone numbers and email addresses never sit in the storefront's
// server-rendered HTML — see VendorContactCard.tsx and StorefrontFooter.tsx.
// A scraper reading page source (or crawling it) finds nothing to harvest.
// A real visitor's browser calls this route once the contact UI mounts, and
// fills the values in client-side instead.
export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const url = new URL(request.url);
  const bookingSlug = url.searchParams.get("booking");
  const orderSlug = url.searchParams.get("order");

  // Same published/preview rule as app/[slug]/layout.tsx — this route can't
  // reveal anything the storefront itself wouldn't already show that visitor.
  let vendor = await getStorefrontVendor(slug);

  if (!vendor) {
    const session = await getSession();
    if (session) {
      const preview = await getStorefrontVendorForPreview(slug);
      if (preview && preview.id === session.vendorId) vendor = preview;
    }
  }

  // Booking/order confirmation pages are public, unguessable-slug capability
  // URLs that don't depend on the storefront being published — see
  // lib/bookings.ts / lib/orders.ts. A customer's receipt must keep showing
  // "how do I reach them" even if the vendor unpublishes afterward, so this
  // checks that the caller actually holds a real booking/order for THIS
  // vendor before falling back to the unpublished-but-active lookup. A
  // suspended vendor stays hidden regardless — that gate applies everywhere
  // else and this route is no exception.
  if (!vendor && bookingSlug) {
    const booking = await getBookingBySlug(bookingSlug);
    if (booking && booking.vendor.slug === slug) {
      vendor = await getStorefrontVendorForPreview(slug);
    }
  }
  if (!vendor && orderSlug) {
    const order = await getOrderBySlug(orderSlug);
    if (order && order.vendor.slug === slug) {
      vendor = await getStorefrontVendorForPreview(slug);
    }
  }
  if (vendor?.suspended) vendor = null;

  if (!vendor) {
    return NextResponse.json({ error: "Shop not found", code: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      phone: vendor.phone ?? null,
      // A vendor can route WhatsApp to a personal handset while still
      // publishing the shop line as their phone number — see lib/vendor-contact.ts.
      whatsappNumber: vendor.personalWhatsappNumber ?? vendor.whatsapp,
      ownerPhone: vendor.ownerPhone ?? null,
      ownerEmail: vendor.ownerEmail ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
