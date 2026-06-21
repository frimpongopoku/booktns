"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Package,
  Settings,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

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
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: active ? "var(--ac)" : "var(--tx3)" }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
