import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeVendorVideo } from "@/lib/serialize";
import { resolveVideoThumbnail } from "@/lib/oembed";

// Auto-assigned server-side (cycled by creation order) rather than exposed
// as a vendor-facing color picker — keeps the "add a video" form to just the
// content fields. Stored as CSS var() expressions rather than literal hex so
// the fallback gradient follows the vendor's storefront theme live (see
// app/globals.css [data-storefront-theme]) instead of freezing whatever
// color was current when the video was added — and correctly stays the
// default red when rendered in the dashboard (VideosClient.tsx), which sits
// outside the storefront's theme scope.
const GRADIENT_PALETTE: [string, string][] = [
  ["var(--brand-accent-light)", "var(--brand-accent-light-2)"],
  ["#18181B", "var(--brand-accent-light)"],
  ["var(--brand-accent-light-2)", "var(--brand-accent-dark-2)"],
  ["color-mix(in srgb, var(--brand-accent-dark) 55%, black)", "var(--brand-accent-light)"],
  ["#0F172A", "var(--brand-accent-light-2)"],
];

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  url: z.string().trim().url("Enter a valid video link"),
  durationSeconds: z.number().int().positive().optional(),
});

export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const videos = await db.vendorVideo.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ videos: videos.map(serializeVendorVideo) });
}

export async function POST(request: Request) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const highestOrder = await db.vendorVideo.aggregate({
    where: { vendorId: auth.session.vendorId },
    _max: { displayOrder: true },
  });
  const nextOrder = (highestOrder._max.displayOrder ?? -1) + 1;
  const [gradientFrom, gradientTo] = GRADIENT_PALETTE[nextOrder % GRADIENT_PALETTE.length];
  const thumbnailUrl = await resolveVideoThumbnail(parsed.data.url);

  const video = await db.vendorVideo.create({
    data: {
      vendorId: auth.session.vendorId,
      title: parsed.data.title,
      description: parsed.data.description,
      url: parsed.data.url,
      durationSeconds: parsed.data.durationSeconds,
      gradientFrom,
      gradientTo,
      thumbnailUrl,
      displayOrder: nextOrder,
    },
  });

  return NextResponse.json({ video: serializeVendorVideo(video) }, { status: 201 });
}
