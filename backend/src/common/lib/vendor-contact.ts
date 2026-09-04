import { SITE_URL } from "../lib/site";

// Every channel a customer can use to reach a vendor, assembled once here
// rather than at each render site. There are no customer accounts, so an
// email or a confirmation page is the only thing a customer holds onto —
// "reach out to them directly" is useless unless the *how* travels with it.
//
// ownerPhone/ownerEmail must already have been checked against the vendor's
// showOwnerPhone/showOwnerEmail flags by whoever builds this object (see
// redactHiddenOwnerDetails in lib/vendors.ts). Nothing downstream re-checks.
export interface VendorContactInfo {
  name: string;
  slug: string;
  location?: string | null;
  hours?: string | null;
  phone?: string | null;
  whatsapp: string;
  // Spec §7.9 — a vendor can route WhatsApp to a personal handset while
  // still publishing the shop line as their phone number.
  personalWhatsappNumber?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
}

// wa.me rejects a leading "+" (and any spacing), while stored numbers are
// always E.164 via lib/phone.ts — so the digits are extracted rather than
// just stripping the plus.
export function whatsappLink(contact: VendorContactInfo, message?: string): string {
  const number = (contact.personalWhatsappNumber ?? contact.whatsapp).replace(/\D/g, "");
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// The storefront's #contact section — the one page that always lists every
// way of reaching a vendor. Absolute, because its main callers are emails
// and PDFs, where a relative path means nothing.
export function vendorContactUrl(slug: string): string {
  return `${SITE_URL}/${slug}#contact`;
}

// True when there is anything to show beyond the WhatsApp button that every
// vendor has — used to decide whether a "more ways to reach us" block is
// worth rendering at all.
export function hasExtraContactChannels(contact: VendorContactInfo): boolean {
  return Boolean(contact.phone || contact.ownerPhone || contact.ownerEmail || contact.location || contact.hours);
}
