import Link from "next/link";
import { apiSuperAdminOrRedirect } from "@/lib/superadmin-auth";
import type { VerificationStatus } from "@/types";
import StatusBadge from "@/components/superadmin/StatusBadge";
import { ChevronRight, Ban } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface VendorRow {
  id: string;
  name: string;
  slug: string;
  location: string;
  suspended: boolean;
  storefrontPublished: boolean;
  verificationStatus: VerificationStatus;
  _count: { bookings: number; orders: number };
}

export default async function VendorsPage({ searchParams }: PageProps) {
  const query = (await searchParams).q?.trim() ?? "";

  const { vendors } = await apiSuperAdminOrRedirect<{ vendors: VendorRow[] }>(
    `/superadmin/vendors${query ? `?q=${encodeURIComponent(query)}` : ""}`,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
          Vendors
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
          {vendors.length} shown{query ? ` for "${query}"` : ""} · demo vendors excluded
        </p>
      </div>

      {/* A plain GET form — search state lives in the URL, so a result list is
          shareable and survives a refresh. */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, slug, or location"
          className="flex-1 px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
          style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-[var(--r)] text-sm font-medium"
          style={{ background: "var(--ac)", color: "white" }}
        >
          Search
        </button>
      </form>

      {vendors.length === 0 ? (
        <div
          className="flex flex-col items-center gap-1 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>No vendors found</p>
          <p className="text-xs" style={{ color: "var(--tx3)" }}>
            {query ? "Try a different search." : "No real vendors have signed up yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/superadmin/vendors/${vendor.id}`}
              className="flex items-center gap-3 p-3.5 rounded-[var(--rl)] transition-colors hover:bg-[var(--bg3)]"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-2" style={{ color: "var(--tx)" }}>
                  {vendor.name}
                  {vendor.suspended && <Ban size={13} style={{ color: "#F87171" }} />}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                  /{vendor.slug} · {vendor.location} · {vendor._count.bookings} bookings ·{" "}
                  {vendor._count.orders} orders
                </p>
              </div>
              {!vendor.storefrontPublished && (
                <span className="text-[11px]" style={{ color: "var(--tx3)" }}>Unpublished</span>
              )}
              <StatusBadge status={vendor.verificationStatus} />
              <ChevronRight size={15} style={{ color: "var(--tx3)" }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
