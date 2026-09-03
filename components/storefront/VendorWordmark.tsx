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
      className={`font-display text-lg font-medium inline-flex items-center gap-2 min-w-0 ${className}`}
      style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
    >
      {logoUrl && (
        <span
          className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: "1px solid var(--bd)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="w-full h-full object-cover" />
        </span>
      )}
      <span className="truncate">{name}</span>
      {verified && <VerifiedBadge size={16} />}
    </Link>
  );
}
