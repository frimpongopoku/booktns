import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";
import OrdersClient from "@/components/dashboard/OrdersClient";

export default async function OrdersPage() {
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
          Orders are limited to owners and management staff.
        </p>
      </div>
    );
  }

  // First view of a new order marks it seen — see CLAUDE.md data rules.
  await db.order.updateMany({
    where: { vendorId: session.vendorId, seenByVendorAt: null },
    data: { seenByVendorAt: new Date() },
  });

  const orders = await db.order.findMany({
    where: { vendorId: session.vendorId },
    include: { items: true, paymentMethod: true },
    orderBy: { createdAt: "desc" },
  });

  return <OrdersClient initialOrders={orders.map(serializeOrder)} />;
}
