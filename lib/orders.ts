import { cache } from "react";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";
import type { Order } from "@/types";

export interface OrderWithVendor extends Order {
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
    // Owner contact, already gated on the vendor's show* flags — the same
    // redaction lib/vendors.ts applies to the storefront. This page is
    // public and unauthenticated, so a hidden field must never reach it.
    ownerPhone?: string;
    ownerEmail?: string;
  };
}

// Public confirmation page lookup — a bare order slug, no vendor scoping in
// the URL (order slugs are globally unique), so this is the only key needed.
export const getOrderBySlug = cache(async (slug: string): Promise<OrderWithVendor | null> => {
  const order = await db.order.findUnique({
    where: { slug },
    include: { items: true, paymentMethod: true, vendor: true },
  });

  if (!order) return null;

  return {
    ...serializeOrder(order),
    vendor: {
      id: order.vendor.id,
      name: order.vendor.name,
      slug: order.vendor.slug,
      location: order.vendor.location,
      hours: order.vendor.hours,
      phone: order.vendor.phone,
      whatsapp: order.vendor.whatsapp,
      personalWhatsappNumber: order.vendor.personalWhatsappNumber ?? undefined,
      logoUrl: order.vendor.logoUrl ?? undefined,
      ownerPhone: order.vendor.showOwnerPhone ? order.vendor.ownerPhone ?? undefined : undefined,
      ownerEmail: order.vendor.showOwnerEmail ? order.vendor.ownerEmail ?? undefined : undefined,
    },
  };
});
