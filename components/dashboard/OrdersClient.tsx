"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/data";
import { apiBrowser, apiUrl, ApiError } from "@/lib/api-client";
import type { Order, OrderStatus } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import { orderStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { X, ChevronRight, Calendar, Hash, Copy, Download } from "lucide-react";

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

interface OrderDrawerProps {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
  updatingStatus: boolean;
}

function OrderDrawer({ order, onClose, onStatusChange, updatingStatus }: OrderDrawerProps) {
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 260); };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className={`flex-1 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
        style={{ background: "rgba(0,0,0,0.35)", cursor: "pointer" }}
        onClick={close}
      />
      {/* Panel */}
      <div
        className={`w-full max-w-sm flex flex-col overflow-hidden ${isExiting ? "anim-slide-out-right" : "anim-slide-right"}`}
        style={{ background: "var(--bg)", borderLeft: "1px solid var(--bd)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
              Order
            </p>
            <p className="text-base font-semibold font-mono" style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}>
              {order.ref}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {orderStatusBadge(order.status)}
            <button
              onClick={close}
              className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors"
              style={{ color: "var(--tx3)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">

            {/* Customer */}
            <div className="p-3.5 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                Customer
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ background: "var(--ac)" }}
                >
                  {order.customerName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    {order.customerName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>
                    {order.customerPhone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--bds)" }}>
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>Preference</p>
                  <p className="text-xs" style={{ color: "var(--tx2)" }}>{order.deliveryPreference}</p>
                </div>
                {order.notes && (
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>Notes</p>
                    <p className="text-xs truncate" style={{ color: "var(--tx2)" }}>{order.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="p-3.5 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                Items
              </p>
              <div className="flex flex-col gap-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm truncate" style={{ color: "var(--tx)" }}>
                        {item.name}
                      </span>
                      <span
                        className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
                        style={{ background: "var(--bg3)", color: "var(--tx3)" }}
                      >
                        ×{item.quantity}
                      </span>
                    </div>
                    <span className="text-sm font-medium flex-shrink-0" style={{ color: "var(--tx2)" }}>
                      {formatPrice(item.priceSnapshot * item.quantity)}
                    </span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between pt-2.5 mt-1"
                  style={{ borderTop: "1px solid var(--bds)" }}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
                    Total
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                    {formatPrice(order.totalPesewas)}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-3.5 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                Details
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: "var(--tx3)" }} />
                  <span className="text-sm" style={{ color: "var(--tx2)" }}>
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash size={13} style={{ color: "var(--tx3)" }} />
                  <span className="text-xs font-mono" style={{ color: "var(--tx3)" }}>
                    {order.slug}
                  </span>
                </div>
              </div>
            </div>

            {/* Status update */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--tx3)" }}>
                Update Status
              </p>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={updatingStatus}
                    onClick={() => { if (s !== order.status) onStatusChange(order.id, s); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-[6px] transition-all disabled:opacity-50"
                    style={{
                      background: s === order.status ? "var(--ac)" : "var(--bg3)",
                      color: s === order.status ? "#fff" : "var(--tx2)",
                      border: s === order.status ? "1px solid transparent" : "1px solid var(--bds)",
                      cursor: s === order.status ? "default" : "pointer",
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex-shrink-0 p-4 flex gap-2"
          style={{ borderTop: "1px solid var(--bd)" }}
        >
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => { if (typeof navigator !== "undefined") navigator.clipboard.writeText(order.ref); }}
          >
            <Copy size={13} />
            Copy ref
          </Button>
          {/* Same public route the customer's confirmation page links to —
              it builds the PDF on first request, so the vendor can pull a
              copy even if the customer never downloaded theirs. */}
          <a
            href={apiUrl(`/orders/by-slug/${order.slug}/pdf`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[var(--r)]"
            style={{ background: "var(--bg2)", color: "var(--tx2)", border: "1px solid var(--bds)" }}
          >
            <Download size={13} />
            Receipt PDF
          </a>
        </div>
      </div>
    </div>
  );
}

interface OrdersClientProps {
  initialOrders: Order[];
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [orderList, setOrderList] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdatingStatus(true);
    setError(null);
    try {
      const { order: updated } = await apiBrowser<{ order: Order }>(`/orders/${id}`, { method: "PATCH", body: { status } });
      setOrderList((prev) => prev.map((o) => (o.id === id ? updated : o)));
      setSelectedOrder((prev) => (prev && prev.id === id ? updated : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div>
      <Topbar title="Orders" subtitle={`${orderList.length} orders`} />

      {error && (
        <div className="px-3 py-2 mb-4 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      <div
        className="rounded-[var(--rl)] overflow-hidden"
        style={{ border: "1px solid var(--bds)" }}
      >
        {/* Table header */}
        <div
          className="hidden md:grid grid-cols-[1.5fr_2fr_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{ background: "var(--bg2)", color: "var(--tx3)" }}
        >
          <span>Order Ref</span>
          <span>Customer</span>
          <span>Items</span>
          <span>Total</span>
          <span>Date</span>
          <span>Status</span>
        </div>

        <div className="flex flex-col gap-0.5 p-2" style={{ background: "var(--bg)" }}>
          {orderList.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full grid md:grid-cols-[1.5fr_2fr_2fr_1fr_1fr_1fr] gap-3 md:gap-4 px-3 py-3.5 rounded-lg hover:bg-[var(--bg2)] transition-colors items-center text-left group"
            >
              {/* Ref */}
              <div className="flex items-center gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                    {order.ref}
                  </p>
                  <div className="md:hidden mt-1">{orderStatusBadge(order.status)}</div>
                </div>
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

              {/* Status */}
              <div className="hidden md:flex items-center justify-between">
                {orderStatusBadge(order.status)}
                <ChevronRight
                  size={14}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: "var(--tx3)" }}
                />
              </div>
            </button>
          ))}

          {orderList.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: "var(--tx3)" }}>No orders yet</p>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateStatus}
          updatingStatus={updatingStatus}
        />
      )}
    </div>
  );
}
