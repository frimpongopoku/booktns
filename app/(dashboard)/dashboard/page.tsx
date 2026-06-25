import Link from "next/link";
import { bookings, orders, products, formatPrice } from "@/lib/data";
import Topbar from "@/components/dashboard/Topbar";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import {
  CalendarCheck,
  Clock,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Eye,
  Plus,
} from "lucide-react";

const todaysBookings = bookings.filter((b) =>
  b.startTime.startsWith("2025-07-16")
);
const pendingBookings = bookings.filter((b) => b.status === "pending");
const pendingOrders = orders.filter((o) => o.status === "new" || o.status === "processing");
const lowStockProducts = products.filter((p) => p.stockCount <= p.lowStockThreshold);

const stats = [
  {
    label: "Today's appointments",
    value: 4,
    icon: CalendarCheck,
    color: "var(--ac)",
    bg: "var(--ac-bg)",
    href: "/dashboard/bookings",
  },
  {
    label: "Pending bookings",
    value: pendingBookings.length,
    icon: Clock,
    color: "var(--amber)",
    bg: "var(--amber-bg)",
    href: "/dashboard/bookings",
  },
  {
    label: "Orders pending",
    value: pendingOrders.length,
    icon: ShoppingBag,
    color: "var(--green)",
    bg: "var(--green-bg)",
    href: "/dashboard/orders",
  },
  {
    label: "Low stock",
    value: lowStockProducts.length,
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

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function DashboardOverview() {
  return (
    <div>
      <Topbar
        title="Overview"
        subtitle="Wednesday, 16 July 2025"
        actions={
          <Link
            href="/glambyrose"
            className="text-xs font-medium px-3 py-1.5 rounded-[var(--r)]"
            style={{ background: "var(--bg3)", color: "var(--tx2)" }}
          >
            View storefront →
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`anim-fade-up anim-d${stats.indexOf(stat) + 1} p-4 rounded-[var(--r)] flex flex-col gap-3 transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md`}
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
              {orders.map((order) => (
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
                    <Badge variant={order.status === "new" ? "new" : "processing"}>
                      {order.status === "new" ? "New" : "Processing"}
                    </Badge>
                  </div>
                </Link>
              ))}
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
