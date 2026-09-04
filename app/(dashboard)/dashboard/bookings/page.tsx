import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import BookingsClient from "@/components/dashboard/BookingsClient";
import type { Booking, Staff } from "@/types";

interface DashboardContext {
  vendor: { slug: string; name: string; location: string };
}

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Spec §7.4's role table draws two different lines here: "view all
  // bookings" is Owner/Management only, but "view own bookings" is granted
  // to Service staff too. The API narrows the query for a Service caller
  // rather than walling the page off — see BookingsService.list.
  const isServiceStaff = session.role === "Service";

  // GET /bookings marks unseen bookings as seen as a side effect for
  // Owner/Management (see BookingsService.list) — same semantics as the
  // direct-Prisma version this replaced. Staff list 403s for Service (its
  // own role restriction), which is fine: the assignment panel it feeds is
  // hidden for a read-only viewer anyway.
  const [{ vendor }, { bookings }, staffResult] = await Promise.all([
    apiServer<DashboardContext>("/vendor/dashboard-context"),
    apiServer<{ bookings: Booking[] }>("/bookings"),
    apiServer<{ staff: Staff[] }>("/staff").catch(() => ({ staff: [] as Staff[] })),
  ]);

  return (
    <BookingsClient
      initialBookings={bookings}
      staff={staffResult.staff}
      vendorSlug={vendor.slug}
      vendorName={vendor.name}
      vendorLocation={vendor.location}
      now={new Date().toISOString()}
      readOnly={isServiceStaff}
    />
  );
}
