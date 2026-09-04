import { cache } from "react";
import { db } from "@/lib/db";
import { serializeBooking } from "@/lib/serialize";
import type { Booking, StorefrontTheme } from "@/types";

export interface BookingWithVendor extends Booking {
  vendor: {
    id: string;
    name: string;
    slug: string;
    location: string;
    hours: string;
    phone: string;
    whatsapp: string;
    personalWhatsappNumber?: string;
    logoUrl?: string;
    // The confirmation page renders the shop's QR, and /api/qr 404s for an
    // unpublished storefront — so the page needs to know before it points an
    // <img> at it.
    storefrontPublished: boolean;
    cancellationPolicy?: string;
    storefrontTheme: StorefrontTheme;
    // Owner contact, already gated on the vendor's show* flags — the same
    // redaction lib/vendors.ts applies to the storefront. This page is
    // public and unauthenticated, so a hidden field must never reach it.
    ownerPhone?: string;
    ownerEmail?: string;
  };
}

// Public confirmation page lookup — a bare booking slug, no vendor scoping in
// the URL (booking slugs are globally unique), so this is the only key needed.
export const getBookingBySlug = cache(async (slug: string): Promise<BookingWithVendor | null> => {
  const booking = await db.booking.findUnique({
    where: { slug },
    include: {
      services: true,
      products: { include: { product: { select: { slug: true } } } },
      staffPreference: { select: { name: true } },
      assignedStaff: { select: { name: true } },
      paymentMethod: true,
      vendor: true,
    },
  });

  if (!booking) return null;

  return {
    ...serializeBooking(booking),
    vendor: {
      id: booking.vendor.id,
      name: booking.vendor.name,
      slug: booking.vendor.slug,
      location: booking.vendor.location,
      hours: booking.vendor.hours,
      phone: booking.vendor.phone,
      whatsapp: booking.vendor.whatsapp,
      personalWhatsappNumber: booking.vendor.personalWhatsappNumber ?? undefined,
      logoUrl: booking.vendor.logoUrl ?? undefined,
      storefrontPublished: booking.vendor.storefrontPublished,
      cancellationPolicy: booking.vendor.cancellationPolicy ?? undefined,
      storefrontTheme: booking.vendor.storefrontTheme,
      ownerPhone: booking.vendor.showOwnerPhone ? booking.vendor.ownerPhone ?? undefined : undefined,
      ownerEmail: booking.vendor.showOwnerEmail ? booking.vendor.ownerEmail ?? undefined : undefined,
    },
  };
});
