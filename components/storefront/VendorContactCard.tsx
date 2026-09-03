import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { whatsappLink, type VendorContactInfo } from "@/lib/vendor-contact";

interface VendorContactCardProps {
  contact: VendorContactInfo;
  // Prefilled WhatsApp text, so a customer messaging about a specific
  // booking or order never has to retype their reference code.
  whatsappMessage?: string;
  // Set on the confirmation pages so the emails' "reach out to them" links
  // can land directly on this card. The storefront sets the anchor on its
  // surrounding <section> instead, and leaves this undefined.
  id?: string;
  className?: string;
}

interface ChannelRow {
  key: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}

// The single block that answers "how do I reach this shop?" — rendered on
// the storefront's #contact section, the booking confirmation page, and the
// order confirmation page, so all three list the same channels in the same
// order however the customer arrived.
export default function VendorContactCard({ contact, whatsappMessage, id, className = "" }: VendorContactCardProps) {
  const rows: ChannelRow[] = [];

  // The shop's own line first, then the owner's — a customer should try the
  // business number before someone's personal one.
  if (contact.phone) {
    rows.push({ key: "phone", icon: <Phone size={15} />, label: "Call", value: contact.phone, href: `tel:${contact.phone}` });
  }
  if (contact.ownerPhone && contact.ownerPhone !== contact.phone) {
    rows.push({ key: "owner-phone", icon: <Phone size={15} />, label: "Call the owner", value: contact.ownerPhone, href: `tel:${contact.ownerPhone}` });
  }
  if (contact.ownerEmail) {
    rows.push({ key: "email", icon: <Mail size={15} />, label: "Email", value: contact.ownerEmail, href: `mailto:${contact.ownerEmail}` });
  }
  if (contact.location) {
    rows.push({ key: "location", icon: <MapPin size={15} />, label: "Visit", value: contact.location });
  }
  if (contact.hours) {
    rows.push({ key: "hours", icon: <Clock size={15} />, label: "Open", value: contact.hours });
  }

  return (
    <div
      id={id}
      className={`p-4 rounded-[var(--rl)] scroll-mt-20 ${className}`}
      style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
        Contact {contact.name}
      </p>

      {/* WhatsApp is the channel every vendor has and the one they actually
          answer on, so it stays the button while everything else is a row. */}
      <a
        href={whatsappLink(contact, whatsappMessage)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium w-full"
        style={{ background: "var(--green-bg)", color: "var(--green)" }}
      >
        <MessageCircle size={15} />
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
                <p className="text-[11px]" style={{ color: "var(--tx3)" }}>{row.label}</p>
                {row.href ? (
                  <a href={row.href} className="text-sm hover:underline break-words" style={{ color: "var(--tx)" }}>
                    {row.value}
                  </a>
                ) : (
                  <p className="text-sm break-words" style={{ color: "var(--tx)" }}>{row.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
