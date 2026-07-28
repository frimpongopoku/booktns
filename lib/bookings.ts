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
    whatsapp: string;
    personalWhatsappNumber?: string;
    cancellationPolicy?: string;
    storefrontTheme: StorefrontTheme;
  };
}

// Public confirmation page lookup — a bare booking slug, no vendor scoping in
// the URL (booking slugs are globally unique), so this is the only key needed.
export const getBookingBySlug = cache(async (slug: string): Promise<BookingWithVendor | null> => {
  const booking = await db.booking.findUnique({
    where: { slug },
    include: {
      services: true,
      products: true,
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
      whatsapp: booking.vendor.whatsapp,
      personalWhatsappNumber: booking.vendor.personalWhatsappNumber ?? undefined,
      cancellationPolicy: booking.vendor.cancellationPolicy ?? undefined,
      storefrontTheme: booking.vendor.storefrontTheme,
    },
  };
});
