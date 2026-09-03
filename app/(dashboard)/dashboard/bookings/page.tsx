import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeBooking, serializeStaff } from "@/lib/serialize";
import BookingsClient from "@/components/dashboard/BookingsClient";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Spec §7.4's role table draws two different lines here: "view all
  // bookings" is Owner/Management only, but "view own bookings" is granted
  // to Service staff too. A stylist needs to know what their day looks
  // like. So rather than walling the page off, the query is narrowed to the
  // bookings actually assigned to them, and the write actions are hidden.
  const isServiceStaff = session.role === "Service";

  // First view of a new booking marks it seen — see CLAUDE.md data rules.
  // Service staff never trip this: they can't act on the notification, so
  // clearing the badge for the whole vendor off their view would hide new
  // bookings from the people who can.
  if (!isServiceStaff) {
    await db.booking.updateMany({
      where: { vendorId: session.vendorId, seenByVendorAt: null },
      data: { seenByVendorAt: new Date() },
    });
  }

  const [vendor, bookings, staffList] = await Promise.all([
    db.vendor.findUnique({ where: { id: session.vendorId }, select: { slug: true, name: true, location: true } }),
    db.booking.findMany({
      // Scoped in the query, not filtered after the fetch — an RSC payload
      // ships every row it loads to the browser whether it's rendered or
      // not, so "fetch all and hide" would leak the whole shop's book.
      where: {
        vendorId: session.vendorId,
        ...(isServiceStaff
          ? { OR: [{ assignedStaffId: session.staffId }, { staffPreferenceId: session.staffId }] }
          : {}),
      },
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
      vendorName={vendor.name}
      vendorLocation={vendor.location}
      readOnly={isServiceStaff}
    />
  );
}
