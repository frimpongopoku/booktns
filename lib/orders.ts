import { cache } from "react";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";
import type { Order } from "@/types";

export interface OrderWithVendor extends Order {
  vendor: {
    id: string;
    name: string;
    slug: string;
    whatsapp: string;
    personalWhatsappNumber?: string;
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
      whatsapp: order.vendor.whatsapp,
      personalWhatsappNumber: order.vendor.personalWhatsappNumber ?? undefined,
    },
  };
});
