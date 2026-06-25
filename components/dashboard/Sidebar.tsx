"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Users,
  Scissors,
  Package,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import Logo from "@/components/shared/Logo";
import ThemeToggle from "@/components/shared/ThemeToggle";
import clsx from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const mainNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: <LayoutDashboard size={15} /> },
  { label: "Bookings", href: "/dashboard/bookings", icon: <Calendar size={15} />, badge: 3 },
  { label: "Orders", href: "/dashboard/orders", icon: <ShoppingBag size={15} />, badge: 2 },
];

const manageNav: NavItem[] = [
  { label: "Staff", href: "/dashboard/staff", icon: <Users size={15} /> },
  { label: "Services", href: "/dashboard/services", icon: <Scissors size={15} /> },
  { label: "Products", href: "/dashboard/products", icon: <Package size={15} /> },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r)] text-sm transition-all duration-150 group",
        active
          ? "font-medium"
          : "hover:bg-[var(--bg3)]"
      )}
      style={active ? { background: "var(--ac-bg)", color: "var(--ac)" } : { color: "var(--tx2)" }}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
          style={{
            background: active ? "var(--ac)" : "var(--bds)",
            color: active ? "white" : "var(--tx3)",
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] flex-shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{
        background: "var(--bg2)",
        borderRight: "1px solid var(--bd)",
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 flex-shrink-0">
        <Logo size="sm" href="/dashboard" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 flex flex-col gap-5">
        {/* Main */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-2.5 mb-1.5" style={{ color: "var(--tx3)" }}>
            Main
          </p>
          <div className="flex flex-col gap-0.5">
            {mainNav.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Manage */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest px-2.5 mb-1.5" style={{ color: "var(--tx3)" }}>
            Manage
          </p>
          <div className="flex flex-col gap-0.5">
            {manageNav.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Settings */}
        <div>
          <div className="flex flex-col gap-0.5">
            <Link
              href="/dashboard/settings"
              className={clsx(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r)] text-sm transition-all duration-150",
                isActive("/dashboard/settings")
                  ? "font-medium"
                  : "hover:bg-[var(--bg3)]"
              )}
              style={
                isActive("/dashboard/settings")
                  ? { background: "var(--ac-bg)", color: "var(--ac)" }
                  : { color: "var(--tx2)" }
              }
            >
              <Settings size={15} />
              <span className="flex-1">Settings</span>
              <ChevronRight size={12} style={{ color: "var(--tx3)" }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-2 py-3 flex items-center gap-2.5"
        style={{ borderTop: "1px solid var(--bd)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 text-white"
          style={{ background: "var(--ac)" }}
        >
          R
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "var(--tx)" }}>
            Rose Adeyemi
          </p>
          <p className="text-[10px] truncate" style={{ color: "var(--tx3)" }}>
            Owner
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            className="p-1.5 rounded-md hover:bg-[var(--bg3)] transition-colors"
            style={{ color: "var(--tx3)" }}
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
