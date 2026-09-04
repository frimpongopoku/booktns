"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";
import type { StaffMembership } from "@/lib/memberships";

interface VendorSwitcherProps {
  memberships: StaffMembership[];
  currentVendorId: string;
}

const ROLE_LABEL: Record<string, string> = {
  Owner: "Owner",
  Management: "Management",
  Service: "Service staff",
};

// Lets someone who is staff at several shops move between them. The role
// travels with the shop — switching reissues the session with whatever role
// this person holds at the target vendor, so an Owner of shop A who is only
// Service staff at shop B loses the owner-only pages on arrival.
//
// Renders nothing at all for the overwhelmingly common single-shop case:
// a switcher with one entry is just noise in the sidebar.
export default function VendorSwitcher({ memberships, currentVendorId }: VendorSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (memberships.length < 2) return null;

  const current = memberships.find((m) => m.vendorId === currentVendorId);

  const handleSwitch = async (vendorId: string) => {
    if (vendorId === currentVendorId) {
      setOpen(false);
      return;
    }
    setSwitchingTo(vendorId);
    setError(null);
    try {
      // switch-vendor-v2 talks to the NestJS API, which re-derives the
      // membership from the database and mints a brand new token — see
      // backend/MIGRATION.md.
      const res = await fetch("/api/auth/switch-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Couldn't switch shops. Please try again.");
        setSwitchingTo(null);
        return;
      }
      // Land on the dashboard root rather than staying put: the current page
      // may be one the new role can't open, and every server component on
      // screen is now holding the previous shop's data.
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
      // Must be cleared explicitly. This sidebar lives in the dashboard
      // layout, so a soft navigation re-renders it with fresh props but
      // never unmounts it — leaving switchingTo set, which pinned the row
      // on "Switching…" forever and kept every row disabled, so a second
      // switch was impossible.
      setSwitchingTo(null);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSwitchingTo(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger: square brand tile, two stacked lines, chevron at the far
          right — the shadcn sidebar switcher shape. Full-bleed and
          borderless so it reads as part of the sidebar rather than as a
          control sitting on top of it. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ac)] data-[open=true]:bg-[var(--bg3)]"
        data-open={open}
      >
        <VendorTile name={current?.vendorName ?? ""} logoUrl={current?.vendorLogoUrl ?? null} size="md" />
        <span className="flex-1 min-w-0 text-left leading-tight">
          <span className="block text-sm font-semibold truncate" style={{ color: "var(--tx)" }}>
            {current?.vendorName ?? "Choose a shop"}
          </span>
          <span className="block text-xs truncate" style={{ color: "var(--tx3)" }}>
            {current ? ROLE_LABEL[current.role] ?? current.role : `${memberships.length} shops`}
          </span>
        </span>
        <ChevronsUpDown size={14} className="flex-shrink-0" style={{ color: "var(--tx3)" }} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 p-1 rounded-[var(--rl)] flex flex-col max-h-[min(20rem,60vh)] overflow-y-auto"
          style={{ background: "var(--bg)", border: "1px solid var(--bd)", boxShadow: "var(--shadow-lg)" }}
        >
          <p
            className="text-[11px] font-medium px-2 pt-1.5 pb-1.5"
            style={{ color: "var(--tx3)" }}
          >
            Shops
          </p>

          {memberships.map((membership, index) => {
            const isCurrent = membership.vendorId === currentVendorId;
            return (
              <button
                key={membership.vendorId}
                type="button"
                role="option"
                aria-selected={isCurrent}
                disabled={switchingTo !== null}
                onClick={() => handleSwitch(membership.vendorId)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--r)] text-left transition-colors hover:bg-[var(--bg3)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ac)]"
              >
                <VendorTile name={membership.vendorName} logoUrl={membership.vendorLogoUrl} size="sm" />
                <span className="flex-1 min-w-0 leading-tight">
                  <span className="block text-sm truncate" style={{ color: "var(--tx)" }}>
                    {membership.vendorName}
                  </span>
                  <span className="block text-[11px] truncate" style={{ color: "var(--tx3)" }}>
                    {switchingTo === membership.vendorId
                      ? "Switching…"
                      : ROLE_LABEL[membership.role] ?? membership.role}
                  </span>
                </span>
                {isCurrent ? (
                  <Check size={14} className="flex-shrink-0" style={{ color: "var(--ac)" }} />
                ) : (
                  // The ⌘-number hints shadcn shows. Not wired to real
                  // shortcuts — they'd collide with the browser's own
                  // tab-switching on every major browser — so they're
                  // hidden from assistive tech rather than announced as
                  // keys that do nothing.
                  index < 9 && (
                    <span
                      aria-hidden="true"
                      className="flex-shrink-0 text-[10px] tabular-nums px-1.5 py-0.5 rounded"
                      style={{ color: "var(--tx3)", background: "var(--bg2)" }}
                    >
                      {index + 1}
                    </span>
                  )
                )}
              </button>
            );
          })}

          <div className="my-1 h-px" style={{ background: "var(--bd)" }} />

          <Link
            href="/onboarding"
            className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)]"
          >
            <span
              className="w-6 h-6 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
              style={{ border: "1px dashed var(--bd)", color: "var(--tx3)" }}
            >
              <Plus size={13} />
            </span>
            <span className="text-sm" style={{ color: "var(--tx2)" }}>
              Add another shop
            </span>
          </Link>

          {error && (
            <p className="text-xs px-2 py-1.5" style={{ color: "#B91C1C" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Rounded square rather than a circle — the shadcn switcher's brand-mark
// shape, and it distinguishes a *shop* from the round avatar used for a
// *person* in the sidebar footer.
function VendorTile({ name, logoUrl, size }: { name: string; logoUrl: string | null; size: "sm" | "md" }) {
  const box = size === "md" ? "w-8 h-8" : "w-6 h-6";
  return (
    <span
      className={`${box} rounded-[var(--r)] overflow-hidden flex items-center justify-center flex-shrink-0 text-xs font-semibold`}
      style={{ background: "var(--ac)", color: "white" }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        name[0]?.toUpperCase() ?? <Store size={13} />
      )}
    </span>
  );
}
