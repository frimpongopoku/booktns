import { cache } from "react";
import { apiPublicOrNull } from "@/lib/api-client";
import type { Order, StorefrontTheme } from "@/types";

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
    storefrontTheme: StorefrontTheme;
    // Owner contact, already gated on the vendor's show* flags — the same
    // redaction lib/vendors.ts applies to the storefront. This page is
    // public and unauthenticated, so a hidden field must never reach it.
    ownerPhone?: string;
    ownerEmail?: string;
  };
}

// Public confirmation page lookup — a bare order slug, no vendor scoping in
// the URL (order slugs are globally unique), so this is the only key
// needed. Backed by the NestJS API's GET /storefront/order/:orderSlug,
// whose service logic is byte-identical to what this file used to do
// directly against Prisma.
export const getOrderBySlug = cache(async (slug: string): Promise<OrderWithVendor | null> => {
  const result = await apiPublicOrNull<{ order: OrderWithVendor }>(`/storefront/order/${slug}`);
  return result?.order ?? null;
});
