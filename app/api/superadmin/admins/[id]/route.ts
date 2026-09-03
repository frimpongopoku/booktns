import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/superadmin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Removing your own access mid-session leaves you signed in with a valid
  // token but no row to sign back in with — an easy way to lock the whole
  // team out of the console by accident.
  if (id === auth.admin.sub) {
    return NextResponse.json(
      { error: "You can't remove your own access. Ask another admin to do it.", code: "self_removal" },
      { status: 400 }
    );
  }

  const total = await db.superAdmin.count();
  if (total <= 1) {
    return NextResponse.json(
      { error: "You can't remove the last administrator.", code: "last_admin" },
      { status: 400 }
    );
  }

  const admin = await db.superAdmin.findUnique({ where: { id }, select: { id: true } });
  if (!admin) {
    return NextResponse.json({ error: "Administrator not found", code: "not_found" }, { status: 404 });
  }

  // A hard delete is right here, unlike everywhere else in this codebase:
  // the row *is* the grant, so soft-deleting it would leave access intact.
  await db.superAdmin.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
