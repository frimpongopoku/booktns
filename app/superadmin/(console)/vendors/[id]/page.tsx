import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client.server";
import { apiSuperAdminOrRedirect } from "@/lib/superadmin-auth";
import { formatPrice } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import type { VerificationStatus, StaffRole } from "@/types";
import StatusBadge from "@/components/superadmin/StatusBadge";
import StatCard from "@/components/superadmin/StatCard";
import VendorActions from "@/components/superadmin/VendorActions";
import { ArrowLeft, Ban, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface VendorDetail {
  id: string;
  name: string;
  slug: string;
  verificationStatus: VerificationStatus;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  staff: { id: string; name: string; email: string; role: StaffRole; verified: boolean }[];
  verificationRequest: { id: string; status: string; legalName: string } | null;
  _count: { bookings: number; orders: number; services: number; products: number };
}

export default async function VendorDetailPage({ params }: PageProps) {
  const { id } = await params;

  let result;
  try {
    result = await apiSuperAdminOrRedirect<{ vendor: VendorDetail; completedValuePesewas: number }>(`/superadmin/vendors/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const { vendor, completedValuePesewas } = result;

  const owner = vendor.staff.find((s) => s.role === "Owner");

  return (
    <div className="flex flex-col gap-7 max-w-2xl">
      <Link href="/superadmin/vendors" className="flex items-center gap-1.5 text-sm w-fit" style={{ color: "var(--tx3)" }}>
        <ArrowLeft size={14} />
        All vendors
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
            {vendor.name}
          </h1>
          <a
            href={`${SITE_URL}/${vendor.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm mt-1 inline-flex items-center gap-1 hover:underline"
            style={{ color: "var(--tx3)" }}
          >
            /{vendor.slug} <ExternalLink size={11} />
          </a>
        </div>
        <StatusBadge status={vendor.verificationStatus} />
      </div>

      {vendor.suspended && (
        <div
          className="flex items-start gap-2.5 p-3.5 rounded-[var(--rl)]"
          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.35)" }}
        >
          <Ban size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#F87171" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#F87171" }}>
              Suspended{vendor.suspendedAt ? ` on ${new Date(vendor.suspendedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>{vendor.suspendedReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Bookings" value={vendor._count.bookings} />
        <StatCard label="Orders" value={vendor._count.orders} />
        <StatCard label="Services" value={vendor._count.services} />
        <StatCard label="Completed value" value={formatPrice(completedValuePesewas)} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
          Staff
        </p>
        <div className="flex flex-col gap-2">
          {vendor.staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-[var(--r)]"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>{member.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>{member.email}</p>
              </div>
              <span className="text-xs" style={{ color: "var(--tx3)" }}>{member.role}</span>
              {member.verified && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "var(--green-bg)", color: "var(--green)" }}
                >
                  ID verified
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {vendor.verificationRequest && (
        <Link
          href={`/superadmin/verifications/${vendor.verificationRequest.id}`}
          className="flex items-center justify-between gap-3 p-3.5 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <p className="text-sm" style={{ color: "var(--tx2)" }}>
            Verification application from {vendor.verificationRequest.legalName}
          </p>
          <span className="text-sm underline" style={{ color: "var(--ac)" }}>Review</span>
        </Link>
      )}

      <div className="pt-5" style={{ borderTop: "1px solid var(--bd)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>Platform actions</p>
        <p className="text-xs mb-4" style={{ color: "var(--tx3)" }}>
          {owner ? `Verification applies to ${owner.name} and every shop they own.` : "This vendor has no active owner."}
        </p>
        <VendorActions
          vendorId={vendor.id}
          suspended={vendor.suspended}
          verified={vendor.verificationStatus === "VERIFIED"}
        />
      </div>
    </div>
  );
}
