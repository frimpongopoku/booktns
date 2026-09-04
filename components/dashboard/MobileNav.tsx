"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Package,
  Wallet,
  Settings,
} from "lucide-react";
import type { StaffRole } from "@/types";

interface MobileNavProps {
  bookingBadgeCount?: number;
  orderBadgeCount?: number;
  role: StaffRole;
}

export default function MobileNav({ bookingBadgeCount = 0, orderBadgeCount = 0, role }: MobileNavProps) {
  const pathname = usePathname();

  // Same role gating as the desktop sidebar — a Service stylist gets
  // Overview and their own Bookings, and none of the pages that would
  // just wall them. Kept in this file rather than shared because the two
  // navs carry different entries at different depths.
  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard, badge: 0, roles: ["Owner", "Management", "Service"] },
    { label: "Bookings", href: "/dashboard/bookings", icon: Calendar, badge: bookingBadgeCount, roles: ["Owner", "Management", "Service"] },
    { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag, badge: orderBadgeCount, roles: ["Owner", "Management"] },
    { label: "Products", href: "/dashboard/products", icon: Package, badge: 0, roles: ["Owner", "Management"] },
    { label: "Get paid", href: "/dashboard/payments", icon: Wallet, badge: 0, roles: ["Owner"] },
    { label: "Settings", href: "/dashboard/settings", icon: Settings, badge: 0, roles: ["Owner"] },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: "var(--bg2)",
        borderTop: "1px solid var(--bd)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {navItems.filter((item) => item.roles.includes(role)).map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: active ? "var(--ac)" : "var(--tx3)" }}
          >
            <span className="relative">
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 text-[9px] font-semibold px-1 rounded-full min-w-[14px] text-center leading-[14px] text-white"
                  style={{ background: "var(--ac)" }}
                >
                  {item.badge}
                </span>
              )}
            </span>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
