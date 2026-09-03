import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { findVendorOwner, verifyPerson } from "@/lib/verification";
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    // Mandatory. The vendor sees this on their own verification page and the
    // next reviewer sees it as "last rejection reason" — a rejection with no
    // stated cause helps nobody.
    reason: z.string().trim().min(1, "Give a reason — the vendor sees it and needs it to fix the problem"),
  }),
]);

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const application = await db.verificationRequest.findUnique({
    where: { id },
    include: { vendor: { select: { id: true, name: true } } },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found", code: "not_found" }, { status: 404 });
  }

  // Guards against two admins opening the same application and both acting.
  if (application.status !== "PENDING") {
    return NextResponse.json(
      { error: "This application has already been reviewed.", code: "already_reviewed" },
      { status: 409 }
    );
  }

  const owner = await findVendorOwner(application.vendorId);
  const now = new Date();

  if (parsed.data.action === "approve") {
    if (!owner) {
      return NextResponse.json(
        { error: "This vendor has no active owner to verify.", code: "no_owner" },
        { status: 409 }
      );
    }

    await db.verificationRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        rejectionReason: null,
        // Taken from the session, never from the request body.
        reviewedBySuperAdminId: auth.admin.sub,
        reviewedAt: now,
      },
    });

    const cascade = await verifyPerson(owner.id);

    // Fire-and-forget: a mail-provider outage must not roll back an approval
    // that has already been written.
    sendVerificationApprovedEmail({
      to: owner.email,
      legalName: application.legalName,
      vendorNames: cascade.vendorNames,
    }).catch((err) => logger.error("sendVerificationApprovedEmail failed", { applicationId: id, err }));

    return NextResponse.json({ ok: true, status: "APPROVED", verifiedVendors: cascade.vendorNames });
  }

  await db.$transaction([
    db.verificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        reviewedBySuperAdminId: auth.admin.sub,
        reviewedAt: now,
      },
    }),
    db.vendor.update({
      where: { id: application.vendorId },
      data: { verificationStatus: "REJECTED" },
    }),
  ]);

  if (owner) {
    sendVerificationRejectedEmail({
      to: owner.email,
      legalName: application.legalName,
      reason: parsed.data.reason,
    }).catch((err) => logger.error("sendVerificationRejectedEmail failed", { applicationId: id, err }));
  }

  return NextResponse.json({ ok: true, status: "REJECTED" });
}
