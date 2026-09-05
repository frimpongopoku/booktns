import PlatformCredit from "@/components/shared/PlatformCredit";
import StartYourOwnShopLink from "@/components/shared/StartYourOwnShopLink";
import FeedbackButton from "@/components/shared/FeedbackButton";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import OwnerContactRow from "@/components/storefront/OwnerContactRow";
import { SITE_URL } from "@/lib/site";
import { getFeedbackInboxEmail } from "@/lib/feedback";

interface StorefrontFooterProps {
  vendorName: string;
  slug: string;
  verified?: boolean;
  // Already redacted by lib/vendors.ts — a field that arrives undefined is
  // one the vendor chose not to publish, so this component never needs to
  // consult the show* flags itself.
  ownerName?: string;
  // Presence only, not the value — the real phone/email are fetched
  // client-side by OwnerContactRow so they never sit in this page's
  // server-rendered HTML. See lib/vendor-contact.ts.
  hasOwnerPhone?: boolean;
  hasOwnerEmail?: boolean;
}

// The one footer every public storefront page renders, so the ownership and
// contact line a vendor sets in Settings shows up everywhere rather than on
// the home page alone.
export default function StorefrontFooter({ vendorName, slug, verified = false, ownerName, hasOwnerPhone = false, hasOwnerEmail = false }: StorefrontFooterProps) {
  const hasOwnerDetails = Boolean(ownerName || hasOwnerPhone || hasOwnerEmail);

  return (
    <footer
      className="mt-auto px-4 md:px-8 py-6 flex flex-col gap-4"
      style={{ borderTop: "1px solid var(--bd)" }}
    >
      {hasOwnerDetails && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {ownerName && (
            <p className="text-base" style={{ color: "var(--tx2)" }}>
              {vendorName} is owned by{" "}
              <span className="font-medium" style={{ color: "var(--tx)" }}>
                {ownerName}
              </span>
            </p>
          )}
          {(hasOwnerPhone || hasOwnerEmail) && (
            <OwnerContactRow slug={slug} hasOwnerPhone={hasOwnerPhone} hasOwnerEmail={hasOwnerEmail} />
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
