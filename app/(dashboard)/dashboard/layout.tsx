import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMembershipsForEmail } from "@/lib/memberships";
import { getFeedbackInboxEmail } from "@/lib/feedback";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import { Store, ExternalLink, Ban } from "lucide-react";
import PlatformCredit from "@/components/shared/PlatformCredit";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Unseen counts — cleared when a vendor first opens the corresponding list
  // page, see the seenByVendorAt updateMany in bookings/orders page.tsx.
  const [bookingBadgeCount, orderBadgeCount, vendor, memberships] = await Promise.all([
    db.booking.count({ where: { vendorId: session.vendorId, seenByVendorAt: null } }),
    db.order.count({ where: { vendorId: session.vendorId, seenByVendorAt: null } }),
    db.vendor.findUnique({
      where: { id: session.vendorId },
      select: {
        slug: true,
        storefrontPublished: true,
        customDomain: true,
        customDomainVerified: true,
        suspended: true,
        suspendedReason: true,
      },
    }),
    // Every shop this Google account is staff at, for the sidebar switcher.
    // Renders nothing when there's only one, which is the common case.
    getMembershipsForEmail(session.email),
  ]);

  if (!vendor) redirect("/login");

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
        {/* The sidebar's storefront link is desktop-only and the mobile
            bottom nav has no free slot, so mobile gets its own strip rather
            than losing the link entirely. */}
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="lg:hidden flex items-center gap-2 px-4 py-2.5 text-sm"
          style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bd)", color: "var(--tx2)" }}
        >
          <Store size={14} style={{ color: vendor.storefrontPublished ? "var(--ac)" : "var(--tx3)" }} />
          <span className="flex-1 truncate">
            {vendor.storefrontPublished ? storefrontLabel : "Preview storefront — not published yet"}
          </span>
          <ExternalLink size={12} style={{ color: "var(--tx3)" }} />
        </a>

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
