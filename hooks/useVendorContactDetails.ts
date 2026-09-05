"use client";

import { useEffect, useState } from "react";

export interface VendorContactDetails {
  phone: string | null;
  whatsappNumber: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
}

interface UseVendorContactDetailsOptions {
  // Lets a booking/order confirmation page keep showing contact info even if
  // the vendor unpublishes afterward — see app/api/storefront/[slug]/contact.
  // Omit on the live storefront, where the publish gate alone is enough.
  bookingSlug?: string;
  orderSlug?: string;
}

// The actual phone/email/WhatsApp digits deliberately never reach the
// server-rendered HTML for a storefront page — see
// components/storefront/VendorContactCard.tsx and StorefrontFooter.tsx. A
// scraper reading page source gets nothing; a real visitor's browser calls
// this hook (which hits app/api/storefront/[slug]/contact) once the contact
// UI mounts and the real values are filled in a moment later.
export function useVendorContactDetails(slug: string, options: UseVendorContactDetailsOptions = {}): VendorContactDetails | null {
  const { bookingSlug, orderSlug } = options;
  const [details, setDetails] = useState<VendorContactDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetails(null);

    const query = new URLSearchParams();
    if (bookingSlug) query.set("booking", bookingSlug);
    if (orderSlug) query.set("order", orderSlug);
    const qs = query.toString();

    fetch(`/api/storefront/${slug}/contact${qs ? `?${qs}` : ""}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VendorContactDetails | null) => {
        if (!cancelled) setDetails(data);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, bookingSlug, orderSlug]);

  return details;
}
