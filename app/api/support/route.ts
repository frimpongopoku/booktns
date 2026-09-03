import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { sendSupportMessageNotification } from "@/lib/email";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

// Any authenticated staff member can reach the Booktns platform team —
// this isn't an ops permission, just "someone at this vendor needs help".
export async function POST(request: Request) {
  const auth = await requireRole(["Owner", "Management", "Service"]);
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const staff = await db.staff.findUnique({
    where: { id: auth.session.staffId },
    select: { name: true, email: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found", code: "not_found" }, { status: 404 });
  }

  const supportMessage = await db.supportMessage.create({
    data: {
      vendorId: auth.session.vendorId,
      staffId: auth.session.staffId,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
  });

  sendSupportMessageNotification({
    vendorName: auth.session.vendorName,
    staffName: staff.name,
    staffEmail: staff.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  }).catch((err) =>
    logger.error("sendSupportMessageNotification failed", {
      supportMessageId: supportMessage.id,
      vendorId: auth.session.vendorId,
      err,
    })
  );

  return NextResponse.json({ supportMessage }, { status: 201 });
}
