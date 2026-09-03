import { Mail, Phone } from "lucide-react";
import PlatformCredit from "@/components/shared/PlatformCredit";
import StartYourOwnShopLink from "@/components/shared/StartYourOwnShopLink";
import FeedbackButton from "@/components/shared/FeedbackButton";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import { SITE_URL } from "@/lib/site";
import { getFeedbackInboxEmail } from "@/lib/feedback";

interface StorefrontFooterProps {
  vendorName: string;
  verified?: boolean;
  // Already redacted by lib/vendors.ts — a field that arrives undefined is
  // one the vendor chose not to publish, so this component never needs to
  // consult the show* flags itself.
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
}

// The one footer every public storefront page renders, so the ownership and
// contact line a vendor sets in Settings shows up everywhere rather than on
// the home page alone.
export default function StorefrontFooter({ vendorName, verified = false, ownerName, ownerPhone, ownerEmail }: StorefrontFooterProps) {
  const hasOwnerDetails = Boolean(ownerName || ownerPhone || ownerEmail);

  return (
    <footer
      className="mt-auto px-4 md:px-8 py-6 flex flex-col gap-4"
      style={{ borderTop: "1px solid var(--bd)" }}
    >
      {hasOwnerDetails && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {ownerName && (
            <p className="text-sm" style={{ color: "var(--tx2)" }}>
              {vendorName} is owned by{" "}
              <span className="font-medium" style={{ color: "var(--tx)" }}>
                {ownerName}
              </span>
            </p>
          )}
          {(ownerPhone || ownerEmail) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {ownerPhone && (
                <a
                  href={`tel:${ownerPhone}`}
                  className="flex items-center gap-1.5 text-sm hover:underline"
                  style={{ color: "var(--tx2)" }}
                >
                  <Phone size={13} style={{ color: "var(--tx3)" }} />
                  {ownerPhone}
                </a>
              )}
              {ownerEmail && (
                <a
                  href={`mailto:${ownerEmail}`}
                  className="flex items-center gap-1.5 text-sm hover:underline"
                  style={{ color: "var(--tx2)" }}
                >
                  <Mail size={13} style={{ color: "var(--tx3)" }} />
                  {ownerEmail}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Two layers of branding, in order of who the visitor came for: the
          vendor's own copyright first, then the platform underneath. */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-xs inline-flex items-center gap-1.5" style={{ color: "var(--tx3)" }}>
            © {new Date().getFullYear()} {vendorName}
            {verified && <VerifiedBadge size={13} showLabel />}
          </p>
          {/* Absolute, not "/" — on a vendor's custom domain a relative root
              is the vendor's own storefront, not the Booktns landing page. */}
          <a href={SITE_URL} className="text-xs" style={{ color: "var(--tx3)" }}>
            Powered by{" "}
            <span className="font-semibold" style={{ color: "var(--ac)" }}>
              booktns
            </span>
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StartYourOwnShopLink />
          <FeedbackButton source="storefront" supportEmail={getFeedbackInboxEmail()} />
        </div>
        <PlatformCredit showCopyright={false} />
      </div>
    </footer>
  );
}
