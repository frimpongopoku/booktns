import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/data";
import Topbar from "@/components/dashboard/Topbar";
import { bookingStatusBadge, orderStatusBadge } from "@/components/ui/Badge";
import {
  CalendarCheck,
  Clock,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Eye,
  Plus,
} from "lucide-react";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default async function DashboardOverview() {
  const session = await getSession();
  if (!session) redirect("/login");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [vendor, activeServiceCount, activeStaffCount, activeProducts, todaysBookings, pendingBookingCount, pendingOrderCount, recentOrders] =
    await Promise.all([
      db.vendor.findUnique({ where: { id: session.vendorId }, select: { slug: true } }),
      db.service.count({ where: { vendorId: session.vendorId, active: true } }),
      db.staff.count({ where: { vendorId: session.vendorId, active: true } }),
      db.product.findMany({
        where: { vendorId: session.vendorId, active: true },
        select: { stockCount: true, lowStockThreshold: true },
      }),
      db.booking.findMany({
        where: { vendorId: session.vendorId, startTime: { gte: startOfToday, lt: startOfTomorrow } },
        include: { services: true },
        orderBy: { startTime: "asc" },
      }),
      db.booking.count({ where: { vendorId: session.vendorId, status: "pending" } }),
      db.order.count({ where: { vendorId: session.vendorId, status: { in: ["new", "processing"] } } }),
      db.order.findMany({
        where: { vendorId: session.vendorId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const lowStockCount = activeProducts.filter((p) => p.stockCount > 0 && p.stockCount <= p.lowStockThreshold).length;

  const stats = [
    {
      label: "Today's appointments",
      value: todaysBookings.length,
      icon: CalendarCheck,
      color: "var(--ac)",
      bg: "var(--ac-bg)",
      href: "/dashboard/bookings",
    },
    {
      label: "Pending bookings",
      value: pendingBookingCount,
      icon: Clock,
      color: "var(--amber)",
      bg: "var(--amber-bg)",
      href: "/dashboard/bookings",
    },
    {
      label: "Orders pending",
      value: pendingOrderCount,
      icon: ShoppingBag,
      color: "var(--green)",
      bg: "var(--green-bg)",
      href: "/dashboard/orders",
    },
    {
      label: "Low stock",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "#B91C1C",
      bg: "rgba(185,28,28,0.08)",
      href: "/dashboard/products",
    },
  ];

  const quickActions = [
    { label: "Confirm a booking", href: "/dashboard/bookings", icon: CheckCircle, color: "var(--ac)" },
    { label: "View pending orders", href: "/dashboard/orders", icon: Eye, color: "var(--green)" },
    { label: "Add a service", href: "/dashboard/services", icon: Plus, color: "var(--amber)" },
    { label: "Add a product", href: "/dashboard/products", icon: Plus, color: "var(--tx2)" },
  ];

  return (
    <div>
      <Topbar
        title="Overview"
        subtitle={now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          vendor && (
            <Link
              href={`/${vendor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium px-3 py-1.5 rounded-[var(--r)]"
              style={{ background: "var(--bg3)", color: "var(--tx2)" }}
            >
              View storefront →
            </Link>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`anim-fade-up anim-d${i + 1} p-4 rounded-[var(--r)] flex flex-col gap-3 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md`}
              style={{ background: "var(--bg2)", boxShadow: "var(--shadow-sm)" }}
            >
              <div
                className="w-8 h-8 rounded-[var(--r)] flex items-center justify-center"
                style={{ background: stat.bg }}
              >
                <Icon size={16} style={{ color: stat.color }} />
              </div>
              <div>
                <p
                  className="font-display text-2xl font-medium"
                  style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
                >
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {stat.label}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Services/staff summary */}
      <div className="flex items-center gap-4 mb-6 text-xs" style={{ color: "var(--tx3)" }}>
        <span>{activeServiceCount} active service{activeServiceCount === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>{activeStaffCount} active staff</span>
      </div>

      {/* Two-column grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's bookings */}
        <div
          className="lg:col-span-2 rounded-[var(--rl)] overflow-hidden"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--bds)" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
              Today&apos;s Bookings
            </h2>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium"
              style={{ color: "var(--ac)" }}
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {todaysBookings.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm" style={{ color: "var(--tx3)" }}>
                  No bookings today
                </p>
              </div>
            ) : (
              todaysBookings.map((booking) => (
                <Link
                  key={booking.id}
                  href="/dashboard/bookings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
                >
                  <div className="flex-shrink-0 text-xs font-medium w-16 text-right" style={{ color: "var(--tx3)" }}>
                    {formatTime(booking.startTime)}
                  </div>
                  <div
                    className="w-px h-8 flex-shrink-0"
                    style={{
                      background:
                        booking.status === "confirmed"
                          ? "var(--ac)"
                          : "var(--bds)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>
                      {booking.customerName}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                      {booking.services.map((s) => s.name).join(" + ")}
                    </p>
                  </div>
                  <div className="flex-shrink-0">{bookingStatusBadge(booking.status)}</div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Recent orders */}
          <div
            className="rounded-[var(--rl)] overflow-hidden"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--bds)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                Recent Orders
              </h2>
              <Link
                href="/dashboard/orders"
                className="text-xs font-medium"
                style={{ color: "var(--ac)" }}
              >
                View all
              </Link>
            </div>
            <div className="flex flex-col gap-0.5 p-2">
              {recentOrders.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm" style={{ color: "var(--tx3)" }}>
                    No orders yet
                  </p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href="/dashboard/orders"
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--tx)" }}>
                        {order.ref}
                      </p>
                      <p className="text-xs truncate max-w-[140px]" style={{ color: "var(--tx3)" }}>
                        {order.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{ color: "var(--tx)" }}>
                        {formatPrice(order.totalPesewas)}
                      </p>
                      {orderStatusBadge(order.status)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div
            className="rounded-[var(--rl)] overflow-hidden"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--bds)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                Quick Actions
              </h2>
            </div>
            <div className="p-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors"
                  >
                    <Icon size={14} style={{ color: action.color }} />
                    <span className="text-sm" style={{ color: "var(--tx2)" }}>
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
