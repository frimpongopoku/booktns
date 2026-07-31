import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeVendor, serializePaymentMethod, serializeVendorVideo } from "@/lib/serialize";
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

  const [vendor, businessHours, paymentMethods, videos] = await Promise.all([
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
  ]);

  if (!vendor) redirect("/login");

  const calendarFeedUrl = `${SITE_URL}/api/calendar/${buildCalendarFeedToken(vendor.id)}`;

  return (
    <SettingsClient
      vendor={serializeVendor(vendor)}
      businessHours={businessHours}
      initialPaymentMethods={paymentMethods.map(serializePaymentMethod)}
      initialVideos={videos.map(serializeVendorVideo)}
      calendarFeedUrl={calendarFeedUrl}
    />
  );
}
