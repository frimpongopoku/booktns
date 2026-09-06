import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client.server";
import { apiSuperAdminOrRedirect } from "@/lib/superadmin-auth";
import type { VerificationStatus } from "@/types";
import StatusBadge from "@/components/superadmin/StatusBadge";
import ReviewActions from "@/components/superadmin/ReviewActions";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ApplicationDetail {
  id: string;
  legalName: string;
  ghanaCardNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  vendorStatus: VerificationStatus;
  vendorId: string;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  hasSelfiePhoto: boolean;
  vendor: { id: string; name: string; slug: string; verificationStatus: VerificationStatus };
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
        {label}
      </p>
      <p
        className="text-sm mt-1"
        style={{ color: "var(--tx)", fontFamily: mono ? "ui-monospace, monospace" : undefined }}
      >
        {value}
      </p>
    </div>
  );
}

export default async function VerificationReviewPage({ params }: PageProps) {
  const { id } = await params;

  let result;
  try {
    result = await apiSuperAdminOrRedirect<{ application: ApplicationDetail; ownerEmail: string | null }>(
      `/superadmin/verifications/${id}`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const { application, ownerEmail } = result;

  return (
    <div className="flex flex-col gap-7 max-w-2xl">
      <Link href="/superadmin/verifications" className="flex items-center gap-1.5 text-sm w-fit" style={{ color: "var(--tx3)" }}>
        <ArrowLeft size={14} />
        All verifications
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
            {application.legalName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
            Applying for{" "}
            <Link href={`/superadmin/vendors/${application.vendor.id}`} className="underline">
              {application.vendor.name}
            </Link>
          </p>
        </div>
        <StatusBadge status={application.vendorStatus} />
      </div>

      <div
        className="grid grid-cols-2 gap-5 p-4 rounded-[var(--rl)]"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <Field label="Legal name" value={application.legalName} />
        <Field label="Ghana Card number" value={application.ghanaCardNumber} mono />
        <Field label="Owner account" value={ownerEmail ?? "No active owner"} />
        <Field
          label="Submitted"
          value={new Date(application.submittedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        />
      </div>

      {application.status === "REJECTED" && application.rejectionReason && (
        <div
          className="flex items-start gap-2.5 p-3.5 rounded-[var(--rl)]"
          style={{ background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.35)" }}
        >
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#F87171" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#F87171" }}>Last rejection reason</p>
            <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>{application.rejectionReason}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
          Documents
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Streamed through the generic backend proxy (/api/admin/superadmin/...),
              which the API's own handler reads from the private bucket
              server-side. These are not public URLs and cannot be opened
              without a superadmin session. */}
          <figure className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/admin/superadmin/verifications/${application.id}/photo/id`}
              alt="Submitted Ghana Card"
              className="w-full rounded-[var(--r)]"
              style={{ background: "var(--bg3)", border: "1px solid var(--bds)" }}
            />
            <figcaption className="text-xs mt-1.5" style={{ color: "var(--tx3)" }}>Ghana Card</figcaption>
          </figure>

          {application.hasSelfiePhoto && (
            <figure className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/superadmin/verifications/${application.id}/photo/selfie`}
                alt="Submitted selfie"
                className="w-full rounded-[var(--r)]"
                style={{ background: "var(--bg3)", border: "1px solid var(--bds)" }}
              />
              <figcaption className="text-xs mt-1.5" style={{ color: "var(--tx3)" }}>Selfie</figcaption>
            </figure>
          )}
        </div>
      </div>

      {application.status === "PENDING" ? (
        <div className="pt-2" style={{ borderTop: "1px solid var(--bd)" }}>
          <p className="text-sm mb-3 pt-4" style={{ color: "var(--tx2)" }}>
            Approving verifies this person and every shop they own, not just this one.
          </p>
          <ReviewActions applicationId={application.id} />
        </div>
      ) : (
        <p className="text-sm pt-4" style={{ color: "var(--tx3)", borderTop: "1px solid var(--bd)" }}>
          Reviewed{" "}
          {application.reviewedAt && new Date(application.reviewedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. To change
          this decision, use the verify/unverify controls on the vendor.
        </p>
      )}
    </div>
  );
}
