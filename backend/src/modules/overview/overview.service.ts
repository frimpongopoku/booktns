import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  // Everything the dashboard Overview page renders, in one call. Ported
  // verbatim from the Next.js page's ten parallel Prisma queries — same
  // "today's bookings, falling back to next-upcoming" and "orders in the
  // last 7 days, falling back to full history" logic, just moved server-side
  // of the API instead of server-side of the page.
  async get(vendorId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      vendor, activeServiceCount, activeStaffCount, activeProducts,
      todaysBookings, upcomingBookings, pendingBookingCount, pendingOrderCount,
      recentOrders, olderOrders,
    ] = await Promise.all([
      this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { slug: true } }),
      this.prisma.service.count({ where: { vendorId, active: true } }),
      this.prisma.staff.count({ where: { vendorId, active: true } }),
      this.prisma.product.findMany({ where: { vendorId, active: true }, select: { stockCount: true, lowStockThreshold: true } }),
      this.prisma.booking.findMany({
        where: { vendorId, startTime: { gte: startOfToday, lt: startOfTomorrow } },
        include: { services: { select: { name: true } } },
        orderBy: { startTime: "asc" },
      }),
      this.prisma.booking.findMany({
        where: { vendorId, startTime: { gte: startOfTomorrow }, status: { notIn: ["cancelled", "completed", "no_show"] } },
        include: { services: { select: { name: true } } },
        orderBy: { startTime: "asc" },
        take: 5,
      }),
      this.prisma.booking.count({ where: { vendorId, status: "pending" } }),
      this.prisma.order.count({ where: { vendorId, status: { in: ["new", "processing"] } } }),
      this.prisma.order.findMany({ where: { vendorId, createdAt: { gte: sevenDaysAgo } }, orderBy: { createdAt: "desc" }, take: 5 }),
      this.prisma.order.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    if (!vendor) throw new NotFoundException({ error: "Vendor not found", code: "not_found" });

    const lowStockCount = activeProducts.filter((p) => p.stockCount > 0 && p.stockCount <= p.lowStockThreshold).length;

    const mapBooking = (b: (typeof todaysBookings)[number]) => ({
      id: b.id,
      customerName: b.customerName,
      startTime: b.startTime.toISOString(),
      status: b.status,
      services: b.services.map((s) => s.name),
    });
    const mapOrder = (o: (typeof recentOrders)[number]) => ({
      id: o.id,
      ref: o.ref,
      customerName: o.customerName,
      createdAt: o.createdAt.toISOString(),
      totalPesewas: o.totalPesewas,
      status: o.status,
    });

    return {
      vendorSlug: vendor.slug,
      activeServiceCount,
      activeStaffCount,
      lowStockCount,
      todaysBookings: todaysBookings.map(mapBooking),
      upcomingBookings: upcomingBookings.map(mapBooking),
      pendingBookingCount,
      pendingOrderCount,
      recentOrders: recentOrders.map(mapOrder),
      olderOrders: olderOrders.map(mapOrder),
    };
  }
}
