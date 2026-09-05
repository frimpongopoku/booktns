"use client";

import { Mail, Phone } from "lucide-react";
import { useVendorContactDetails } from "@/hooks/useVendorContactDetails";

interface OwnerContactRowProps {
  slug: string;
  hasOwnerPhone: boolean;
  hasOwnerEmail: boolean;
}

function ValueSkeleton() {
  return <span className="inline-block h-4 w-24 rounded animate-pulse" style={{ background: "var(--bg3)" }} />;
}

// The one part of StorefrontFooter that needs a client component: the
// owner's real phone/email never sit in the page's server-rendered HTML
// (see hooks/useVendorContactDetails.ts) — a scraper reading page source
// finds nothing to harvest. The number/address fills in a moment after
// mount instead, same trick as VendorContactCard.
export default function OwnerContactRow({ slug, hasOwnerPhone, hasOwnerEmail }: OwnerContactRowProps) {
  const details = useVendorContactDetails(slug);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {hasOwnerPhone && (
        <span className="flex items-center gap-1.5 text-base" style={{ color: "var(--tx2)" }}>
          <Phone size={14} style={{ color: "var(--tx3)" }} />
          {details?.ownerPhone ? (
            <a href={`tel:${details.ownerPhone}`} className="hover:underline">
              {details.ownerPhone}
            </a>
          ) : (
            <ValueSkeleton />
          )}
        </span>
      )}
      {hasOwnerEmail && (
        <span className="flex items-center gap-1.5 text-base" style={{ color: "var(--tx2)" }}>
          <Mail size={14} style={{ color: "var(--tx3)" }} />
          {details?.ownerEmail ? (
            <a href={`mailto:${details.ownerEmail}`} className="hover:underline">
              {details.ownerEmail}
            </a>
          ) : (
            <ValueSkeleton />
          )}
        </span>
      )}
    </div>
  );
}
