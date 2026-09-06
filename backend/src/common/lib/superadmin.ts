import { db } from "./prisma-client";

// The seeded demo vendor is real data in the database — it powers a live
// public demo storefront — but it is not an actual business. It is excluded
// from every platform count, the revenue total, and the vendor list, because
// including it would make the platform's own metrics quietly lie.
//
// Set DEMO_VENDOR_SLUGS to a comma-separated list to exclude more.
const DEMO_VENDOR_SLUGS = (process.env.DEMO_VENDOR_SLUGS ?? "glambyakosua")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

export const realVendorsFilter = { slug: { notIn: DEMO_VENDOR_SLUGS } };

export interface PlatformOverview {
  vendorCount: number;
  publishedCount: number;
  suspendedCount: number;
  staffCount: number;
  bookingCount: number;
  orderCount: number;
  grossPesewas: number;
  pendingVerifications: number;
  verifiedVendors: number;
  signupsByDay: { date: string; count: number }[];
  demoVendorsExcluded: number;
}

const SIGNUP_WINDOW_DAYS = 30;

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const since = new Date(Date.now() - SIGNUP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const realVendorIds = (
    await db.vendor.findMany({ where: realVendorsFilter, select: { id: true } })
  ).map((v) => v.id);

  const vendorScope = { vendorId: { in: realVendorIds } };

  const [
    vendorCount,
    publishedCount,
    suspendedCount,
    staffCount,
    bookingCount,
    orderCount,
    orderTotals,
    pendingVerifications,
    verifiedVendors,
    demoVendorsExcluded,
    recentVendors,
  ] = await Promise.all([
    db.vendor.count({ where: realVendorsFilter }),
    db.vendor.count({ where: { ...realVendorsFilter, storefrontPublished: true } }),
    db.vendor.count({ where: { ...realVendorsFilter, suspended: true } }),
    db.staff.count({ where: { ...vendorScope, active: true } }),
    db.booking.count({ where: vendorScope }),
    db.order.count({ where: vendorScope }),
    // Completed orders only — a cancelled or still-new order isn't revenue.
    db.order.aggregate({ where: { ...vendorScope, status: "completed" }, _sum: { totalPesewas: true } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.vendor.count({ where: { ...realVendorsFilter, verificationStatus: "VERIFIED" } }),
    db.vendor.count({ where: { slug: { in: DEMO_VENDOR_SLUGS } } }),
    db.vendor.findMany({
      where: { ...realVendorsFilter, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // Bucketed in JS rather than SQL: the window is 30 days of vendor signups,
  // which is a tiny result set, and this keeps the date handling in one place
  // instead of split between a raw query and the formatter.
  const counts = new Map<string, number>();
  for (let i = SIGNUP_WINDOW_DAYS - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    counts.set(day, 0);
  }
  for (const vendor of recentVendors) {
    const day = vendor.createdAt.toISOString().slice(0, 10);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return {
    vendorCount,
    publishedCount,
    suspendedCount,
    staffCount,
    bookingCount,
    orderCount,
    grossPesewas: orderTotals._sum.totalPesewas ?? 0,
    pendingVerifications,
    verifiedVendors,
    signupsByDay: [...counts.entries()].map(([date, count]) => ({ date, count })),
    demoVendorsExcluded,
  };
}

export async function countPendingVerifications(): Promise<number> {
  return db.verificationRequest.count({ where: { status: "PENDING" } });
}
