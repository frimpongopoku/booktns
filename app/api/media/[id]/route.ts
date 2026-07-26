import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeMedia } from "@/lib/serialize";
import { deleteFile, keyFromPublicUrl } from "@/lib/storage";

const updateSchema = z.object({
  tags: z.array(z.string().trim().toLowerCase().min(1)).max(20, "Up to 20 tags per file"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const existing = await db.media.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "File not found", code: "not_found" }, { status: 404 });
  }

  const media = await db.media.update({
    where: { id },
    data: { tags: [...new Set(parsed.data.tags)] },
  });

  return NextResponse.json({ media: serializeMedia(media) });
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
