import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCalendarFeedToken, buildBookingsIcsFeed } from "@/lib/calendar-feed";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// Public, unauthenticated by design — this is a calendar SUBSCRIPTION URL,
// fetched periodically by Google/Apple/Outlook's own poller, which can't
// attach a session cookie. The token itself is the credential (see
// lib/calendar-feed.ts) — same trust model as booking/order confirmation
// links elsewhere in this app.
export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const vendorId = verifyCalendarFeedToken(token);
  if (!vendorId) {
    return NextResponse.json({ error: "Invalid calendar link", code: "invalid_token" }, { status: 404 });
  }

  const vendor = await db.vendor.findUnique({ where: { id: vendorId }, select: { name: true } });
  if (!vendor) {
    return NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
  }

  // Upcoming and still-live only — a calendar feed is for "what's on my
  // schedule," not a historical export. Cancelled bookings never occupied
  // real time and completed ones are already in the past by definition.
  const bookings = await db.booking.findMany({
    where: {
      vendorId,
      status: { in: ["pending", "confirmed", "rescheduled"] },
      startTime: { gte: new Date() },
    },
    include: { services: { select: { name: true } }, assignedStaff: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });

  const ics = buildBookingsIcsFeed(
    vendor.name,
    bookings.map((b) => ({
      id: b.id,
      customerName: b.customerName,
      services: b.services,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      assignedStaffName: b.assignedStaff?.name,
    }))
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
