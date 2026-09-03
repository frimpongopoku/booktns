import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { sendSuperAdminInviteEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().max(80).optional(),
});

export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const admins = await db.superAdmin.findMany({ orderBy: { invitedAt: "asc" } });
  return NextResponse.json({ admins });
}

// Adding a row here is what grants access — there is no separate acceptance
// step. The email is a courtesy telling them the access exists.
export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const existing = await db.superAdmin.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "That email already has access.", code: "already_exists" }, { status: 409 });
  }

  const admin = await db.superAdmin.create({
    data: { email: parsed.data.email, name: parsed.data.name || null },
  });

  sendSuperAdminInviteEmail({ to: admin.email, invitedBy: auth.admin.email }).catch((err) =>
    logger.error("sendSuperAdminInviteEmail failed", { email: admin.email, err })
  );

  return NextResponse.json({ admin }, { status: 201 });
}
