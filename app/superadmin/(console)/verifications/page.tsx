import Link from "next/link";
import { db } from "@/lib/db";
import StatusBadge from "@/components/superadmin/StatusBadge";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const REQUEST_TO_VENDOR_STATUS = {
  PENDING: "PENDING",
  APPROVED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;

export default async function VerificationsPage() {
  const applications = await db.verificationRequest.findMany({
    include: { vendor: { select: { name: true, slug: true } } },
    // Pending first, then most recent — a reviewer opening this page wants
    // the queue, not a chronological log.
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
  });

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
          Verifications
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
          {pending.length} waiting for review · {reviewed.length} already decided
        </p>
      </div>

      {applications.length === 0 ? (
        <div
          className="flex flex-col items-center gap-1 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>No applications yet</p>
          <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
            Vendors submit these from Settings → Verification in their own dashboard.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[
            { title: "Waiting for review", rows: pending },
            { title: "Reviewed", rows: reviewed },
          ]
            .filter((section) => section.rows.length > 0)
            .map((section) => (
              <div key={section.title}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
                  {section.title}
                </p>
                <div className="flex flex-col gap-2">
                  {section.rows.map((application) => (
                    <Link
                      key={application.id}
                      href={`/superadmin/verifications/${application.id}`}
                      className="flex items-center gap-3 p-3.5 rounded-[var(--rl)] transition-colors hover:bg-[var(--bg3)]"
                      style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>
                          {application.legalName}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                          {application.vendor.name} · submitted{" "}
                          {application.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <StatusBadge status={REQUEST_TO_VENDOR_STATUS[application.status]} />
                      <ChevronRight size={15} style={{ color: "var(--tx3)" }} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
