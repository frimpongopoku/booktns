import Link from "next/link";
import VerifiedBadge from "@/components/shared/VerifiedBadge";

interface VendorWordmarkProps {
  name: string;
  href: string;
  logoUrl?: string;
  verified?: boolean;
  className?: string;
}

// The vendor's own identity in the top-left of every customer-facing page —
// storefront home, shop, product, pay, book, and the booking/order
// confirmation pages. Extracted once the same logo-plus-name markup was
// needed in six places; a vendor who uploads a logo in Settings should see
// it on all of them without anyone having to remember each header.
//
// No `next/image`: logos are arbitrary vendor uploads on R2 behind a
// configurable public URL, which is what the rest of the storefront already
// does for vendor media.
export default function VendorWordmark({ name, href, logoUrl, verified = false, className = "" }: VendorWordmarkProps) {
  return (
    <Link
      href={href}
      // Was text-lg/font-medium — read as plain nav text, no different from
      // the slug it sits next to in the URL bar. This is the one place a
      // vendor's actual shop name gets to make a statement rather than just
      // being a functional label, so it now gets the same weight/tracking
      // treatment as Booktns's own wordmark (components/shared/Logo.tsx).
      className={`font-display text-2xl font-semibold inline-flex items-center gap-2.5 min-w-0 ${className}`}
      style={{ fontFamily: "var(--font-display)", color: "var(--tx)", letterSpacing: "-0.02em" }}
    >
      {logoUrl && (
        <span
          className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: "1px solid var(--bd)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="w-full h-full object-cover" />
        </span>
      )}
      <span className="truncate">{name}</span>
      {verified && <VerifiedBadge size={17} />}
    </Link>
  );
}
