import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getFeedbackInboxEmail } from "@/lib/feedback";
import { getMembershipsForEmail } from "@/lib/memberships";
import { apiServer, ApiError } from "@/lib/api-client.server";
import { SITE_URL } from "@/lib/site";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import MobileTopStrip from "@/components/dashboard/MobileTopStrip";
import { Ban } from "lucide-react";
import PlatformCredit from "@/components/shared/PlatformCredit";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // One call to the NestJS API for the whole dashboard shell — badge
  // counts, vendor slug/publish/domain/suspension state. See
  // VendorService.dashboardContext.
  let dashboardContext;
  try {
    dashboardContext = await apiServer<{
      vendor: { slug: string; storefrontPublished: boolean; customDomain: string | null; customDomainVerified: boolean; suspended: boolean; suspendedReason: string | null };
      bookingBadgeCount: number;
      orderBadgeCount: number;
    }>("/vendor/dashboard-context");
  } catch (err) {
    // A stale or forged cookie verifies locally (getSession above only
    // checks the signature) — the API is what actually re-checks the
    // vendor still exists. 401/404 from it means this session is no longer
    // good for anything.
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) redirect("/login");
    throw err;
  }
  const { vendor, bookingBadgeCount, orderBadgeCount } = dashboardContext;

  // Every shop this Google account is staff at, for the sidebar switcher.
  // Renders nothing when there's only one, which is the common case. Stays
  // a direct DB read: this server component already holds a verified
  // session, so there's no reason to round-trip it through the API's own
  // auth guard on a page that renders on every dashboard load.
  const memberships = await getMembershipsForEmail(session.email);

  // A custom domain is only usable once verified — before that the platform
  // URL is the one that actually resolves, so that's what we link to.
  const onCustomDomain = Boolean(vendor.customDomain && vendor.customDomainVerified);
  const storefrontUrl = onCustomDomain ? `https://${vendor.customDomain}` : `${SITE_URL}/${vendor.slug}`;
  const storefrontLabel = onCustomDomain
    ? vendor.customDomain!
    : `${SITE_URL.replace(/^https?:\/\//, "")}/${vendor.slug}`;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar
        staffName={session.staffName}
        role={session.role}
        vendorName={session.vendorName}
        memberships={memberships}
        currentVendorId={session.vendorId}
        supportEmail={getFeedbackInboxEmail()}
        bookingBadgeCount={bookingBadgeCount}
        orderBadgeCount={orderBadgeCount}
        storefrontUrl={storefrontUrl}
        storefrontLabel={storefrontLabel}
        storefrontPublished={vendor.storefrontPublished}
      />
      {/* flex column so the platform credit at the bottom stays docked to
          the viewport on short pages (Overview with no data, an empty list)
          instead of riding up under the last card. */}
      <main
        className="flex-1 overflow-y-auto pb-20 lg:pb-0 flex flex-col"
        style={{ background: "var(--bg)" }}
      >
        {/* The sidebar's storefront link AND logout are both desktop-only,
            and the mobile bottom nav has no free slot for either, so mobile
            gets this one strip rather than losing both entirely. */}
        <MobileTopStrip
          storefrontUrl={storefrontUrl}
          storefrontLabel={storefrontLabel}
          storefrontPublished={vendor.storefrontPublished}
        />

        {/* The vendor's own view of a suspension. Shoppers see a neutral
            "unavailable" page; the reason is surfaced only here, to them. */}
        {vendor.suspended && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
            <div
              className="flex items-start gap-3 p-4 rounded-[var(--rl)]"
              style={{ background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.35)" }}
            >
              <Ban size={17} className="mt-0.5 flex-shrink-0" style={{ color: "#B91C1C" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#B91C1C" }}>
                  Your storefront has been suspended
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>
                  {vendor.suspendedReason}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--tx3)" }}>
                  Customers can&apos;t reach your storefront. Your bookings and orders are unaffected and
                  still here. Reply from Settings → Help &amp; Support to sort this out.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>

        <footer className="mt-auto w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8 pt-4">
          <PlatformCredit />
        </footer>
      </main>
      <MobileNav bookingBadgeCount={bookingBadgeCount} orderBadgeCount={orderBadgeCount} role={session.role} />
    </div>
  );
}
