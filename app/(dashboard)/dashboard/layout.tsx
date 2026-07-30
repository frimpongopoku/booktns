import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Unseen counts — cleared when a vendor first opens the corresponding list
  // page, see the seenByVendorAt updateMany in bookings/orders page.tsx.
  const [bookingBadgeCount, orderBadgeCount] = await Promise.all([
    db.booking.count({ where: { vendorId: session.vendorId, seenByVendorAt: null } }),
    db.order.count({ where: { vendorId: session.vendorId, seenByVendorAt: null } }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar
        staffName={session.staffName}
        role={session.role}
        vendorName={session.vendorName}
        bookingBadgeCount={bookingBadgeCount}
        orderBadgeCount={orderBadgeCount}
      />
      <main
        className="flex-1 overflow-y-auto pb-20 lg:pb-0"
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
      <MobileNav bookingBadgeCount={bookingBadgeCount} orderBadgeCount={orderBadgeCount} />
    </div>
  );
}
