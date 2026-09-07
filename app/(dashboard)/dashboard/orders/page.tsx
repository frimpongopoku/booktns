import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import OrdersClient from "@/components/dashboard/OrdersClient";
import type { Order } from "@/types";

export const metadata: Metadata = { title: "Orders" };

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

  // GET /orders marks unseen orders as seen as a side effect — see
  // OrdersService.list.
  const { orders } = await apiServer<{ orders: Order[] }>("/orders");

  return <OrdersClient initialOrders={orders} />;
}
