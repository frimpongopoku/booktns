"use client";

import { useState } from "react";
import { orders as initialOrders, formatPrice } from "@/lib/data";
import type { Order, OrderStatus } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import { orderStatusBadge } from "@/components/ui/Badge";
import { ChevronDown } from "lucide-react";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}

const ORDER_STATUSES: OrderStatus[] = ["new", "processing", "ready", "completed", "cancelled"];
const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  processing: "Processing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const [orderList, setOrderList] = useState<Order[]>(initialOrders);

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrderList((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  };

  return (
    <div>
      <Topbar title="Orders" subtitle={`${orderList.length} orders`} />

      <div
        className="rounded-[var(--rl)] overflow-hidden"
        style={{ border: "1px solid var(--bds)" }}
      >
        {/* Table header */}
        <div
          className="hidden md:grid grid-cols-[1.5fr_2fr_2fr_1fr_1fr_1.5fr] gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{
            background: "var(--bg2)",
            color: "var(--tx3)",
            borderBottom: "1px solid var(--bds)",
          }}
        >
          <span>Order Ref</span>
          <span>Customer</span>
          <span>Items</span>
          <span>Total</span>
          <span>Date</span>
          <span>Status</span>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--bds)", background: "var(--bg)" }}>
          {orderList.map((order) => (
            <div
              key={order.id}
              className="grid md:grid-cols-[1.5fr_2fr_2fr_1fr_1fr_1.5fr] gap-3 md:gap-4 px-5 py-4 items-center"
            >
              {/* Ref */}
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                  {order.ref}
                </p>
                <div className="md:hidden mt-1">{orderStatusBadge(order.status)}</div>
              </div>

              {/* Customer */}
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                  {order.customerName}
                </p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {order.customerPhone}
                </p>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm truncate" style={{ color: "var(--tx2)" }}>
                  {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                </p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {order.items.length} item{order.items.length > 1 ? "s" : ""}
                </p>
              </div>

              {/* Total */}
              <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                {formatPrice(order.totalPesewas)}
              </p>

              {/* Date */}
              <p className="text-xs hidden md:block" style={{ color: "var(--tx3)" }}>
                {formatDate(order.createdAt)}
              </p>

              {/* Status dropdown */}
              <div className="hidden md:block">
                <div className="relative inline-flex items-center">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                    className="appearance-none pl-2 pr-7 py-1.5 rounded-[var(--r)] text-xs font-medium focus:outline-none cursor-pointer"
                    style={{
                      background:
                        order.status === "new"
                          ? "var(--amber-bg)"
                          : order.status === "processing"
                          ? "var(--green-bg)"
                          : order.status === "cancelled"
                          ? "rgba(185,28,28,0.08)"
                          : order.status === "completed"
                          ? "var(--green-bg)"
                          : "rgba(37,99,235,0.08)",
                      color:
                        order.status === "new"
                          ? "var(--amber)"
                          : order.status === "processing"
                          ? "var(--green)"
                          : order.status === "cancelled"
                          ? "#B91C1C"
                          : order.status === "completed"
                          ? "var(--green)"
                          : "#2563EB",
                      border: "none",
                    }}
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s} style={{ background: "var(--bg)", color: "var(--tx)" }}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-1.5 pointer-events-none"
                    style={{
                      color:
                        order.status === "new"
                          ? "var(--amber)"
                          : order.status === "processing"
                          ? "var(--green)"
                          : "var(--tx3)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {orderList.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: "var(--tx3)" }}>
                No orders yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
