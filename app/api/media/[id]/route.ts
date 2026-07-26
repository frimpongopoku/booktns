import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteFile, keyFromPublicUrl } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await db.media.findFirst({
    where: { id, vendorId: auth.session.vendorId },
  });
  if (!existing) {
    return NextResponse.json({ error: "File not found", code: "not_found" }, { status: 404 });
  }

  const key = keyFromPublicUrl(existing.url);
  if (key) {
    await deleteFile(key);
  }

  await db.media.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
