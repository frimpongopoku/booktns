import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSuperAdminSession, clearSuperAdminSession } from "@/lib/superadmin-auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

const bodySchema = z.object({ idToken: z.string().min(1) });

// Identical wording whether the email is unknown, belongs to an ordinary
// vendor, or was removed as a superadmin. It must never confirm whether an
// account exists anywhere in the system.
const NOT_AUTHORIZED = {
  error: "This Google account is not authorized for the superadmin console.",
  code: "not_authorized",
};

// Same identity provider as the vendor login — the *allowlist table* is what
// differs, not the provider. There is deliberately no signup route: a row in
// SuperAdmin is the only way in, created by the bootstrap script or by an
// existing admin's invite.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid idToken", code: "invalid_request" }, { status: 400 });
  }

  const verified = await verifyFirebaseIdToken(parsed.data.idToken);
  if (!verified || !verified.emailVerified) {
    return NextResponse.json({ error: "Google sign-in could not be verified", code: "invalid_token" }, { status: 401 });
  }

  const admin = await db.superAdmin.findFirst({
    where: { email: { equals: verified.email, mode: "insensitive" } },
  });

  if (!admin) {
    return NextResponse.json(NOT_AUTHORIZED, { status: 403 });
  }

  // Stamped on first successful sign-in, so the console can show which
  // invitations have actually been taken up.
  if (!admin.acceptedAt) {
    await db.superAdmin.update({ where: { id: admin.id }, data: { acceptedAt: new Date() } });
  }

  await createSuperAdminSession(admin);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSuperAdminSession();
  return NextResponse.json({ ok: true });
}
