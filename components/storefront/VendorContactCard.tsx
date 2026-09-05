"use client";

import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { whatsappLink, type VendorContactMeta } from "@/lib/vendor-contact";
import { useVendorContactDetails } from "@/hooks/useVendorContactDetails";

interface VendorContactCardProps {
  contact: VendorContactMeta;
  // Prefilled WhatsApp text, so a customer messaging about a specific
  // booking or order never has to retype their reference code.
  whatsappMessage?: string;
  // Set on the confirmation pages so the emails' "reach out to them" links
  // can land directly on this card. The storefront sets the anchor on its
  // surrounding <section> instead, and leaves this undefined.
  id?: string;
  className?: string;
  // Lets contact info keep loading even if the vendor unpublishes after this
  // booking/order was placed — see useVendorContactDetails.
  bookingSlug?: string;
  orderSlug?: string;
}

interface ChannelRow {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}

function ValueSkeleton() {
  return <span className="inline-block h-4 w-28 rounded animate-pulse" style={{ background: "var(--bg3)" }} />;
}

// The single block that answers "how do I reach this shop?" — rendered on
// the storefront's #contact section, the booking confirmation page, and the
// order confirmation page, so all three list the same channels in the same
// order however the customer arrived.
//
// A client component on purpose: the actual phone numbers and email address
// are never part of this page's server-rendered HTML (see
// useVendorContactDetails) — a scraper reading page source finds nothing to
// harvest. `contact` only carries which channels exist, not their values;
// the real values arrive a moment after mount and fill in below a brief
// skeleton, same trick browsers already do for lazy images.
export default function VendorContactCard({ contact, whatsappMessage, id, className = "", bookingSlug, orderSlug }: VendorContactCardProps) {
  const details = useVendorContactDetails(contact.slug, { bookingSlug, orderSlug });

  const rows: ChannelRow[] = [];
  if (contact.hasPhone) {
    rows.push({
      key: "phone",
      icon: <Phone size={16} />,
      label: "Call",
      value: details?.phone ?? "",
      href: details?.phone ? `tel:${details.phone}` : "",
    });
  }
  if (contact.hasDistinctOwnerPhone) {
    rows.push({
      key: "owner-phone",
      icon: <Phone size={16} />,
      label: "Call the owner",
      value: details?.ownerPhone ?? "",
      href: details?.ownerPhone ? `tel:${details.ownerPhone}` : "",
    });
  }
  if (contact.hasOwnerEmail) {
    rows.push({
      key: "email",
      icon: <Mail size={16} />,
      label: "Email",
      value: details?.ownerEmail ?? "",
      href: details?.ownerEmail ? `mailto:${details.ownerEmail}` : "",
    });
  }
  if (contact.location) {
    rows.push({ key: "location", icon: <MapPin size={16} />, label: "Visit", value: contact.location, href: "" });
  }
  if (contact.hours) {
    rows.push({ key: "hours", icon: <Clock size={16} />, label: "Open", value: contact.hours, href: "" });
  }

  const whatsappHref = details ? whatsappLink(details.whatsappNumber, whatsappMessage) : undefined;

  return (
    <div
      id={id}
      className={`p-4 rounded-[var(--rl)] scroll-mt-20 ${className}`}
      style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
        Contact {contact.name}
      </p>

      {/* WhatsApp is the channel every vendor has and the one they actually
          answer on, so it stays the button while everything else is a row.
          href is only ever real once the number has loaded — before that
          it's inert rather than pointing at a placeholder. */}
      <a
        href={whatsappHref ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!whatsappHref}
        onClick={(e) => {
          if (!whatsappHref) e.preventDefault();
        }}
        className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-base font-medium w-full"
        style={{ background: "var(--green-bg)", color: "var(--green)", opacity: whatsappHref ? 1 : 0.6 }}
      >
        <MessageCircle size={16} />
        Message on WhatsApp
      </a>

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--bds)" }}>
          {rows.map((row) => (
            <div key={row.key} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex-shrink-0" style={{ color: "var(--tx3)" }}>
                {row.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs" style={{ color: "var(--tx3)" }}>{row.label}</p>
                {row.href ? (
                  <a href={row.href} className="text-base hover:underline break-words" style={{ color: "var(--tx)" }}>
                    {row.value}
                  </a>
                ) : row.value ? (
                  <p className="text-base break-words" style={{ color: "var(--tx)" }}>{row.value}</p>
                ) : (
                  <ValueSkeleton />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
