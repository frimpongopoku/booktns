"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Users,
  Scissors,
  Package,
  Images,
  Video,
  Settings,
  Wallet,
  LogOut,
  ChevronRight,
  Store,
  ExternalLink,
} from "lucide-react";
import Logo from "@/components/shared/Logo";
import ThemeToggle from "@/components/shared/ThemeToggle";
import FeedbackButton from "@/components/shared/FeedbackButton";
import VendorSwitcher from "@/components/dashboard/VendorSwitcher";
import type { StaffMembership } from "@/lib/memberships";
import { getFirebaseAuth } from "@/lib/firebase-client";
import type { StaffRole } from "@/types";
import clsx from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

// Roles that can open each entry, mirroring the guards on the pages
// themselves (and spec §7.4's table). The page guard is the enforcement;
// this only stops the sidebar advertising doors that won't open — a Service
// stylist previously saw all five and got walled by every one.
const manageNav: (NavItem & { roles: StaffRole[] })[] = [
  { label: "Staff", href: "/dashboard/staff", icon: <Users size={15} />, roles: ["Owner"] },
  { label: "Services", href: "/dashboard/services", icon: <Scissors size={15} />, roles: ["Owner", "Management"] },
  { label: "Products", href: "/dashboard/products", icon: <Package size={15} />, roles: ["Owner", "Management"] },
  { label: "Media", href: "/dashboard/media", icon: <Images size={15} />, roles: ["Owner", "Management"] },
  { label: "Videos", href: "/dashboard/videos", icon: <Video size={15} />, roles: ["Owner", "Management"] },
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

interface SidebarProps {
  staffName: string;
  role: StaffRole;
  vendorName: string;
  bookingBadgeCount: number;
  orderBadgeCount: number;
  // The vendor's own public storefront — full URL plus the short form to
  // display, both resolved server-side so custom-domain handling lives in
  // one place (app/(dashboard)/dashboard/layout.tsx).
  storefrontUrl: string;
  storefrontLabel: string;
  storefrontPublished: boolean;
  // Every shop this signed-in Google account is staff at. One entry is the
  // normal case and renders no switcher at all.
  memberships: StaffMembership[];
  currentVendorId: string;
  supportEmail: string;
}

export default function Sidebar({
  staffName,
  role,
  vendorName,
  bookingBadgeCount,
  orderBadgeCount,
  storefrontUrl,
  storefrontLabel,
  storefrontPublished,
  memberships,
  currentVendorId,
  supportEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const mainNav: NavItem[] = [
    { label: "Overview", href: "/dashboard", icon: <LayoutDashboard size={15} /> },
    {
      label: "Bookings",
      href: "/dashboard/bookings",
      icon: <Calendar size={15} />,
      badge: bookingBadgeCount > 0 ? bookingBadgeCount : undefined,
    },
    ...(role === "Service"
      ? []
      : [
          {
            label: "Orders",
            href: "/dashboard/orders",
            icon: <ShoppingBag size={15} />,
            badge: orderBadgeCount > 0 ? orderBadgeCount : undefined,
          },
        ]),
    // Owner-only, matching the page guard and /api/payment-methods.
    ...(role === "Owner"
      ? [{ label: "Get paid", href: "/dashboard/payments", icon: <Wallet size={15} /> }]
      : []),
  ];

  const visibleManageNav = manageNav.filter((item) => item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    // session-v2's DELETE just clears our own cookie — there is no server
    // session to destroy, since the API holds no session state.
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(getFirebaseAuth()).catch(() => {});
    router.push("/login");
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

      {/* Which shop you're in, when you're in more than one. Directly under
          the logo, because everything else in this sidebar — the nav, the
          storefront link, the counts — is scoped to whatever is picked
          here. */}
      {memberships.length > 1 && (
        <div className="px-2 pb-4 flex-shrink-0">
          <VendorSwitcher memberships={memberships} currentVendorId={currentVendorId} />
        </div>
      )}

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

        {/* Manage — hidden entirely for a role with nothing in it. */}
        {visibleManageNav.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2.5 mb-1.5" style={{ color: "var(--tx3)" }}>
              Manage
            </p>
            <div className="flex flex-col gap-0.5">
              {visibleManageNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        )}

        {/* Settings — Owner-only, matching the page's own guard. */}
        <div>
          <div className="flex flex-col gap-0.5">
            {role === "Owner" && (
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
            )}
          </div>
        </div>
      </nav>

      {/* Utility block, docked above the account footer. Both of these were
          previously misplaced: the storefront link sat at the top, directly
          under the shop switcher, where two stacked controls naming the
          same shop read as one confusing pair; and the feedback button sat
          at the end of the nav list, which left it stranded mid-sidebar in
          whatever empty space the nav didn't fill. Neither belongs in the
          scroll of "places to go" — they're standing utilities, so they
          live at the bottom edge with the account row. */}
      <div className="flex-shrink-0 px-2 pb-2 flex flex-col gap-0.5">
        {/* Staff are already identified by their session server-side, so the
            dialog doesn't ask them for an address we have. */}
        <FeedbackButton source="dashboard" supportEmail={supportEmail} knownSender variant="sidebar" />
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)]"
        >
          <Store size={15} className="flex-shrink-0" style={{ color: storefrontPublished ? "var(--ac)" : "var(--tx3)" }} />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-medium truncate" style={{ color: "var(--tx2)" }}>
              {storefrontPublished ? "View storefront" : "Preview storefront"}
            </span>
            <span className="block text-[10px] truncate" style={{ color: storefrontPublished ? "var(--tx3)" : "var(--amber)" }}>
              {storefrontPublished ? storefrontLabel : "Not published yet"}
            </span>
          </span>
          <ExternalLink size={11} className="flex-shrink-0" style={{ color: "var(--tx3)" }} />
        </a>
      </div>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-2 py-3 flex items-center gap-2.5"
        style={{ borderTop: "1px solid var(--bd)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 text-white"
          style={{ background: "var(--ac)" }}
        >
          {staffName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: "var(--tx)" }}>
            {staffName}
          </p>
          <p className="text-[10px] truncate" style={{ color: "var(--tx3)" }}>
            {role} · {vendorName}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            onClick={() => setConfirmingLogout(true)}
            className="p-1.5 rounded-md hover:bg-[var(--bg3)] transition-colors"
            style={{ color: "var(--tx3)" }}
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {confirmingLogout && (
        <ConfirmDialog
          title="Log out"
          message="Are you sure you want to log out?"
          confirmLabel="Log out"
          danger
          onConfirm={handleLogout}
          onCancel={() => setConfirmingLogout(false)}
        />
      )}
    </aside>
  );
}
