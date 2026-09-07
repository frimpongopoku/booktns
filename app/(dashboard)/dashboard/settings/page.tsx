import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import { buildCalendarFeedToken } from "@/lib/calendar-feed";
import { SITE_URL } from "@/lib/site";
import SettingsClient from "@/components/dashboard/SettingsClient";
import type { Vendor, BusinessHours, VendorVideo, Service } from "@/types";

interface VerificationStatusResponse {
  status: string;
  verifiedAt: string | null;
  application: import("@/components/dashboard/VerificationTab").VerificationApplication | null;
}

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role !== "Owner") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
        style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>You don&apos;t have access to this page</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
          Settings — storefront, booking, domain, and verification — are limited to the business owner.
        </p>
      </div>
    );
  }

  // Every call below is Owner-only on the API too — this page's own guard
  // above is UX, not the security boundary; @Roles("Owner") on each endpoint
  // is what actually enforces it.
  const [{ vendor }, { days: businessHours }, { videos }, { services }, verification, domain] = await Promise.all([
    apiServer<{ vendor: Vendor }>("/vendor"),
    apiServer<{ days: BusinessHours[] }>("/vendor/hours"),
    apiServer<{ videos: VendorVideo[] }>("/videos"),
    apiServer<{ services: Service[] }>("/services"),
    apiServer<VerificationStatusResponse>("/verification"),
    // GET /vendor/domain does a live provider recheck rather than trusting
    // the cached customDomainVerified column — which is actually more
    // correct than what this page used to do (read the possibly-stale
    // column straight off a raw Prisma row). serializeVendor()/the shared
    // Vendor type never expose customDomain at all; DomainTab in
    // SettingsClient already fetches this endpoint itself for the same
    // reason.
    apiServer<{ domain: string | null; verified: boolean }>("/vendor/domain"),
  ]);

  // The calendar feed is served by the NestJS API now (GET /calendar/:token
  // on the backend), not by this Next.js app — the subscription URL a
  // vendor pastes into Google/Apple/Outlook has to point at that host.
  // buildCalendarFeedToken signs with JWT_SECRET, which must be
  // byte-identical between the two deployments (see DEPLOYMENT.md), so a
  // token minted here verifies there.
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:2666";
  const calendarFeedUrl = `${apiOrigin}/api/calendar/${buildCalendarFeedToken(vendor.id)}`;

  // Links the vendor hands to customers should use their own domain once
  // it's actually verified — an unverified one doesn't resolve yet, so
  // sharing it would hand out a dead link.
  const storefrontOrigin = domain.domain && domain.verified ? `https://${domain.domain}` : SITE_URL;

  return (
    <SettingsClient
      vendor={vendor}
      businessHours={businessHours}
      initialVideos={videos}
      calendarFeedUrl={calendarFeedUrl}
      storefrontOrigin={storefrontOrigin}
      services={services}
      verificationApplication={verification.application}
    />
  );
}
