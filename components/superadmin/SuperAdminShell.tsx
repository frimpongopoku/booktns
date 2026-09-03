"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import clsx from "clsx";
import { getFirebaseAuth } from "@/lib/firebase-client";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { LayoutDashboard, BadgeCheck, Store, ShieldAlert, Users, LogOut } from "lucide-react";
import type { SuperAdminSessionPayload } from "@/lib/superadmin-auth";

const NAV = [
  { label: "Overview", href: "/superadmin", icon: LayoutDashboard },
  { label: "Verifications", href: "/superadmin/verifications", icon: BadgeCheck },
  { label: "Vendors", href: "/superadmin/vendors", icon: Store },
  { label: "Admins", href: "/superadmin/admins", icon: Users },
];

interface SuperAdminShellProps {
  admin: SuperAdminSessionPayload;
  pendingVerifications: number;
  children: React.ReactNode;
}

export default function SuperAdminShell({ admin, pendingVerifications, children }: SuperAdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const isActive = (href: string) =>
    href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch("/api/superadmin/auth/session", { method: "DELETE" });
    await signOut(getFirebaseAuth()).catch(() => {});
    router.push("/superadmin/login");
  };

  return (
    // `dark superadmin-scope` is what swaps the whole palette to violet —
    // see the SUPERADMIN CONSOLE SCOPE block in globals.css.
    <div className="dark superadmin-scope min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header
        className="px-4 md:px-6 py-3 flex items-center justify-between gap-4"
        style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bd)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--ac-bg)", border: "1px solid var(--ac)" }}
          >
            <ShieldAlert size={17} style={{ color: "var(--ac)" }} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.2em] leading-none"
              style={{ color: "var(--ac)", fontFamily: "ui-monospace, monospace" }}
            >
              Superadmin
            </p>
            <p className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--tx)" }}>
              Booktns platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <p className="text-xs hidden sm:block truncate max-w-[200px]" style={{ color: "var(--tx3)" }}>
            {admin.email}
          </p>
          <button
            onClick={() => setConfirmingLogout(true)}
            className="p-2 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)]"
            style={{ color: "var(--tx3)" }}
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <nav
        className="px-4 md:px-6 flex gap-1 overflow-x-auto"
        style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bd)" }}
      >
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
                active ? "font-medium" : "hover:text-[var(--tx)]"
              )}
              style={{
                borderColor: active ? "var(--ac)" : "transparent",
                color: active ? "var(--ac)" : "var(--tx2)",
              }}
            >
              <Icon size={14} />
              {item.label}
              {item.label === "Verifications" && pendingVerifications > 0 && (
                <span
                  className="text-[10px] font-semibold px-1.5 rounded-full min-w-[18px] text-center"
                  style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
                >
                  {pendingVerifications}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      {confirmingLogout && (
        <ConfirmDialog
          title="Sign out"
          message="Sign out of the superadmin console?"
          confirmLabel="Sign out"
          danger
          onConfirm={handleLogout}
          onCancel={() => setConfirmingLogout(false)}
        />
      )}
    </div>
  );
}
