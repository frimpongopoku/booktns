import Link from "next/link";
import { formatPrice } from "@/lib/data";
import { getPlatformOverview } from "@/lib/superadmin";
import StatCard from "@/components/superadmin/StatCard";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  const stats = await getPlatformOverview();
  const peak = Math.max(1, ...stats.signupsByDay.map((d) => d.count));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
          Platform overview
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
          Every number here excludes {stats.demoVendorsExcluded} demo vendor
          {stats.demoVendorsExcluded === 1 ? "" : "s"}.
        </p>
      </div>

      {stats.pendingVerifications > 0 && (
        <Link
          href="/superadmin/verifications"
          className="flex items-center justify-between gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--amber-bg)", border: "1px solid var(--amber)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--amber)" }}>
            {stats.pendingVerifications} verification
            {stats.pendingVerifications === 1 ? "" : "s"} waiting for review
          </p>
          <ArrowRight size={16} style={{ color: "var(--amber)" }} />
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Vendors" value={stats.vendorCount} hint={`${stats.publishedCount} published`} />
        <StatCard label="Staff" value={stats.staffCount} />
        <StatCard label="Bookings" value={stats.bookingCount} />
        <StatCard label="Orders" value={stats.orderCount} />
        <StatCard
          label="Completed order value"
          value={formatPrice(stats.grossPesewas)}
          hint="Completed orders only"
        />
        <StatCard label="Verified vendors" value={stats.verifiedVendors} />
        <StatCard
          label="Awaiting review"
          value={stats.pendingVerifications}
          tone={stats.pendingVerifications > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Suspended"
          value={stats.suspendedCount}
          tone={stats.suspendedCount > 0 ? "warn" : "default"}
        />
      </div>

      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>
          Vendor signups — last 30 days
        </p>
        <div
          className="p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div className="flex items-end gap-[3px] h-24">
            {stats.signupsByDay.map((day) => (
              <div
                key={day.date}
                className="flex-1 rounded-t-[2px] min-h-[2px]"
                style={{
                  height: `${(day.count / peak) * 100}%`,
                  background: day.count > 0 ? "var(--ac)" : "var(--bg3)",
                }}
                title={`${day.date}: ${day.count} signup${day.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--tx3)" }}>
            <span>{stats.signupsByDay[0]?.date}</span>
            <span>{stats.signupsByDay[stats.signupsByDay.length - 1]?.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
