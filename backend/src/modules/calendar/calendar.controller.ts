import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../common/decorators";
import { PrismaService } from "../../common/prisma/prisma.service";
import { verifyCalendarFeedToken, buildBookingsIcsFeed } from "../../common/lib/calendar-feed";

// Public, unauthenticated by design — a calendar SUBSCRIPTION URL, fetched
// periodically by Google/Apple/Outlook's own poller, which can't attach a
// session. The token itself is the credential (lib/calendar-feed.ts).
@Public()
@Controller("calendar")
export class CalendarController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":token")
  async get(@Param("token") token: string, @Res() res: Response) {
    const vendorId = verifyCalendarFeedToken(token);
    if (!vendorId) throw new NotFoundException({ error: "Invalid calendar link", code: "invalid_token" });

    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true } });
    if (!vendor) throw new NotFoundException({ error: "Not found", code: "not_found" });

    // Upcoming and still-live only — a calendar feed is "what's on my
    // schedule," not a historical export.
    const bookings = await this.prisma.booking.findMany({
      where: { vendorId, status: { in: ["pending", "confirmed", "rescheduled"] }, startTime: { gte: new Date() } },
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
      })),
    );

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(ics);
  }
}
