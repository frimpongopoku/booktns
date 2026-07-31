import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBooking, serializeStaff } from "@/lib/serialize";
import BookingsClient from "@/components/dashboard/BookingsClient";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "Service") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
        style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>You don&apos;t have access to this page</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
          Bookings management is limited to owners and management staff.
        </p>
      </div>
    );
  }

  // First view of a new booking marks it seen — see CLAUDE.md data rules.
  await db.booking.updateMany({
    where: { vendorId: session.vendorId, seenByVendorAt: null },
    data: { seenByVendorAt: new Date() },
  });

  const [vendor, bookings, staffList] = await Promise.all([
    db.vendor.findUnique({ where: { id: session.vendorId }, select: { slug: true } }),
    db.booking.findMany({
      where: { vendorId: session.vendorId },
      include: {
        services: true,
        products: { include: { product: { select: { slug: true } } } },
        staffPreference: { select: { name: true } },
        assignedStaff: { select: { name: true } },
        paymentMethod: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.staff.findMany({ where: { vendorId: session.vendorId, active: true } }),
  ]);

  if (!vendor) redirect("/login");

  return (
    <BookingsClient
      initialBookings={bookings.map(serializeBooking)}
      staff={staffList.map(serializeStaff)}
      vendorSlug={vendor.slug}
    />
  );
}
