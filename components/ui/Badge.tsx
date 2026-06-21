import clsx from "clsx";
import type { BookingStatus, OrderStatus } from "@/types";

type BadgeVariant =
  | "confirmed"
  | "pending"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "new"
  | "processing"
  | "ready"
  | "active"
  | "inactive"
  | "low"
  | "out"
  | "owner"
  | "management"
  | "service"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  confirmed: {
    background: "var(--amber-bg)",
    color: "var(--amber)",
  },
  pending: {
    background: "var(--bds)",
    color: "var(--tx3)",
  },
  completed: {
    background: "var(--green-bg)",
    color: "var(--green)",
  },
  cancelled: {
    background: "rgba(185,28,28,0.08)",
    color: "#B91C1C",
  },
  rescheduled: {
    background: "rgba(37,99,235,0.08)",
    color: "#2563EB",
  },
  new: {
    background: "var(--amber-bg)",
    color: "var(--amber)",
  },
  processing: {
    background: "var(--green-bg)",
    color: "var(--green)",
  },
  ready: {
    background: "rgba(37,99,235,0.08)",
    color: "#2563EB",
  },
  active: {
    background: "var(--green-bg)",
    color: "var(--green)",
  },
  inactive: {
    background: "var(--bds)",
    color: "var(--tx3)",
  },
  low: {
    background: "var(--amber-bg)",
    color: "var(--amber)",
  },
  out: {
    background: "rgba(185,28,28,0.08)",
    color: "#B91C1C",
  },
  owner: {
    background: "var(--ac-bg)",
    color: "var(--ac)",
  },
  management: {
    background: "rgba(37,99,235,0.08)",
    color: "#2563EB",
  },
  service: {
    background: "var(--green-bg)",
    color: "var(--green)",
  },
  default: {
    background: "var(--bds)",
    color: "var(--tx2)",
  },
};

export default function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        className
      )}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}

export function bookingStatusBadge(status: BookingStatus) {
  const map: Record<BookingStatus, BadgeVariant> = {
    confirmed: "confirmed",
    pending: "pending",
    completed: "completed",
    cancelled: "cancelled",
    rescheduled: "rescheduled",
  };
  const labels: Record<BookingStatus, string> = {
    confirmed: "Confirmed",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
    rescheduled: "Rescheduled",
  };
  return <Badge variant={map[status]}>{labels[status]}</Badge>;
}

export function orderStatusBadge(status: OrderStatus) {
  const map: Record<OrderStatus, BadgeVariant> = {
    new: "new",
    processing: "processing",
    ready: "ready",
    completed: "completed",
    cancelled: "cancelled",
  };
  const labels: Record<OrderStatus, string> = {
    new: "New",
    processing: "Processing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return <Badge variant={map[status]}>{labels[status]}</Badge>;
}
