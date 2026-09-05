"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Store, ExternalLink, LogOut } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getFirebaseAuth } from "@/lib/firebase-client";

interface MobileTopStripProps {
  storefrontUrl: string;
  storefrontLabel: string;
  storefrontPublished: boolean;
}

// The sidebar's storefront link AND its logout button are both desktop-only
// (Sidebar.tsx is `hidden lg:flex`), and the mobile bottom nav
// (components/dashboard/MobileNav.tsx) has no free slot for either — Log
// out isn't a navigation destination anyway. Mobile gets this one strip
// instead of losing both entirely; every role sees it regardless of which
// bottom-nav tabs they have (Settings, where a desktop user might otherwise
// look for logout, is Owner-only in the mobile nav).
export default function MobileTopStrip({ storefrontUrl, storefrontLabel, storefrontPublished }: MobileTopStripProps) {
  const router = useRouter();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const handleLogout = async () => {
    // session-v2's DELETE just clears our own cookie — there is no server
    // session to destroy, since the API holds no session state.
    await fetch("/api/auth/session", { method: "DELETE" });
    await signOut(getFirebaseAuth()).catch(() => {});
    router.push("/login");
  };

  return (
    <>
      <div
        className="lg:hidden flex items-center gap-2 px-4 py-2.5"
        style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bd)" }}
      >
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 flex items-center gap-2 text-sm"
          style={{ color: "var(--tx2)" }}
        >
          <Store size={14} style={{ color: storefrontPublished ? "var(--ac)" : "var(--tx3)" }} />
          <span className="flex-1 truncate">
            {storefrontPublished ? storefrontLabel : "Preview storefront — not published yet"}
          </span>
          <ExternalLink size={12} style={{ color: "var(--tx3)" }} />
        </a>
        <button
          onClick={() => setConfirmingLogout(true)}
          className="p-1.5 rounded-md hover:bg-[var(--bg3)] transition-colors flex-shrink-0"
          style={{ color: "var(--tx3)" }}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={16} />
        </button>
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
    </>
  );
}
