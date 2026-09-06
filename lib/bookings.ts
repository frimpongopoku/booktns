import { cache } from "react";
import { apiPublicOrNull } from "@/lib/api-client";
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
// the URL (booking slugs are globally unique), so this is the only key
// needed. Backed by the NestJS API's GET /storefront/booking/:bookingSlug,
// whose service logic is byte-identical to what this file used to do
// directly against Prisma.
export const getBookingBySlug = cache(async (slug: string): Promise<BookingWithVendor | null> => {
  const result = await apiPublicOrNull<{ booking: BookingWithVendor }>(`/storefront/booking/${slug}`);
  return result?.booking ?? null;
});
