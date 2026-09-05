import { SITE_URL } from "@/lib/site";

// The non-sensitive shape of "how do I reach this shop?" — built once here
// rather than at each render site. Deliberately carries no phone numbers or
// email addresses: those are fetched client-side, on mount, via
// useVendorContactDetails (hooks/useVendorContactDetails.ts) instead of
// flowing through server-rendered props, so the raw digits never sit in the
// page's initial HTML for a scraper to harvest. See
// components/storefront/VendorContactCard.tsx and StorefrontFooter.tsx.
//
// ownerEmail/hasDistinctOwnerPhone must already have been checked against
// the vendor's showOwnerPhone/showOwnerEmail flags by whoever builds this
// object (see redactHiddenOwnerDetails in lib/vendors.ts). Nothing
// downstream re-checks.
export interface VendorContactMeta {
  name: string;
  slug: string;
  location?: string | null;
  hours?: string | null;
  hasPhone: boolean;
  // True only when the owner's phone is set AND differs from the shop's own
  // number — a customer shouldn't see the same number listed twice. The
  // comparison happens here, server-side, where both real values are still
  // in hand; only the resulting boolean crosses into a rendered prop.
  hasDistinctOwnerPhone: boolean;
  hasOwnerEmail: boolean;
}

interface VendorContactSource {
  name: string;
  slug: string;
  location?: string | null;
  hours?: string | null;
  phone?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
}

export function buildVendorContactMeta(vendor: VendorContactSource): VendorContactMeta {
  return {
    name: vendor.name,
    slug: vendor.slug,
    location: vendor.location,
    hours: vendor.hours,
    hasPhone: Boolean(vendor.phone),
    hasDistinctOwnerPhone: Boolean(vendor.ownerPhone && vendor.ownerPhone !== vendor.phone),
    hasOwnerEmail: Boolean(vendor.ownerEmail),
  };
}

// wa.me rejects a leading "+" (and any spacing), while stored numbers are
// always E.164 via lib/phone.ts — so the digits are extracted rather than
// just stripping the plus. `number` arrives already resolved (personal
// WhatsApp number if the vendor set one, else the shop's) — see
// useVendorContactDetails's `whatsappNumber` field.
export function whatsappLink(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// The storefront's #contact section — the one page that always lists every
// way of reaching a vendor. Absolute, because its main callers are emails
// and PDFs, where a relative path means nothing.
export function vendorContactUrl(slug: string): string {
  return `${SITE_URL}/${slug}#contact`;
}
