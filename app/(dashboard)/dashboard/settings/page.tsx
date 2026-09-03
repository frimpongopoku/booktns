import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeVendor, serializePaymentMethod, serializeVendorVideo, serializeService } from "@/lib/serialize";
import { buildCalendarFeedToken } from "@/lib/calendar-feed";
import { SITE_URL } from "@/lib/site";
import SettingsClient from "@/components/dashboard/SettingsClient";

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
          Settings — storefront, payment, booking, WhatsApp, and billing — are limited to the business owner.
        </p>
      </div>
    );
  }

  const [vendor, businessHours, paymentMethods, videos, services, verificationApplication] = await Promise.all([
    db.vendor.findUnique({ where: { id: session.vendorId } }),
    db.businessHours.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { dayOfWeek: "asc" },
    }),
    db.paymentMethod.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { displayOrder: "asc" },
    }),
    db.vendorVideo.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { displayOrder: "asc" },
    }),
    db.service.findMany({
      where: { vendorId: session.vendorId, active: true },
      orderBy: { displayOrder: "asc" },
    }),
    db.verificationRequest.findUnique({
      where: { vendorId: session.vendorId },
      // No photo keys — the vendor's own UI has no use for them.
      select: { legalName: true, ghanaCardNumber: true, status: true, rejectionReason: true, submittedAt: true },
    }),
  ]);

  if (!vendor) redirect("/login");

  const calendarFeedUrl = `${SITE_URL}/api/calendar/${buildCalendarFeedToken(vendor.id)}`;

  // Links the vendor hands to customers should use their own domain once
  // it's actually verified — an unverified one doesn't resolve yet, so
  // sharing it would hand out a dead link.
  const storefrontOrigin =
    vendor.customDomain && vendor.customDomainVerified ? `https://${vendor.customDomain}` : SITE_URL;

  return (
    <SettingsClient
      vendor={serializeVendor(vendor)}
      businessHours={businessHours}
      initialPaymentMethods={paymentMethods.map(serializePaymentMethod)}
      initialVideos={videos.map(serializeVendorVideo)}
      calendarFeedUrl={calendarFeedUrl}
      storefrontOrigin={storefrontOrigin}
      services={services.map(serializeService)}
      verificationApplication={
        verificationApplication
          ? { ...verificationApplication, submittedAt: verificationApplication.submittedAt.toISOString() }
          : null
      }
    />
  );
}
