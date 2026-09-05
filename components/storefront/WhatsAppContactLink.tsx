"use client";

import { whatsappLink } from "@/lib/vendor-contact";
import { useVendorContactDetails } from "@/hooks/useVendorContactDetails";

interface WhatsAppContactLinkProps {
  slug: string;
  message?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

// An inline "message us on WhatsApp" link for spots that aren't the full
// VendorContactCard (e.g. the pay page's "send your receipt" line). Same
// trick: the number never sits in this page's server-rendered HTML, so the
// href is only ever real once the number has loaded — see
// useVendorContactDetails.
export default function WhatsAppContactLink({ slug, message, className, style, children }: WhatsAppContactLinkProps) {
  const details = useVendorContactDetails(slug);
  const href = details ? whatsappLink(details.whatsappNumber, message) : undefined;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!href}
      onClick={(e) => {
        if (!href) e.preventDefault();
      }}
      className={className}
      style={{ ...style, opacity: href ? 1 : 0.6 }}
    >
      {children}
    </a>
  );
}
