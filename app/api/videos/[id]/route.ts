import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeVendorVideo } from "@/lib/serialize";
import { resolveVideoThumbnail } from "@/lib/oembed";

const updateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  description: z.string().trim().optional(),
  url: z.string().trim().url("Enter a valid video link").optional(),
  durationSeconds: z.number().int().positive().optional(),
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

  const existing = await db.vendorVideo.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Video not found", code: "not_found" }, { status: 404 });
  }

  // Only re-resolve the thumbnail when the link itself is changing — no need
  // to hit the oEmbed endpoint again for a title/description-only edit.
  const thumbnailUrl = parsed.data.url ? await resolveVideoThumbnail(parsed.data.url) : undefined;

  const video = await db.vendorVideo.update({
    where: { id },
    data: { ...parsed.data, ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}) },
  });

  return NextResponse.json({ video: serializeVendorVideo(video) });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await db.vendorVideo.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Video not found", code: "not_found" }, { status: 404 });
  }

  await db.vendorVideo.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
