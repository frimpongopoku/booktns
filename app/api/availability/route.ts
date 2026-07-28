import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability";

const querySchema = z.object({
  vendorSlug: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  durationMinutes: z.coerce.number().int().positive(),
  staffId: z.string().trim().optional(),
  excludeBookingId: z.string().trim().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    vendorSlug: searchParams.get("vendorSlug") ?? "",
    date: searchParams.get("date") ?? "",
    durationMinutes: searchParams.get("durationMinutes") ?? "",
    staffId: searchParams.get("staffId") ?? undefined,
    excludeBookingId: searchParams.get("excludeBookingId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const vendor = await db.vendor.findUnique({
    where: { slug: parsed.data.vendorSlug },
    select: { id: true, active: true, storefrontPublished: true },
  });
  if (!vendor || !vendor.active || !vendor.storefrontPublished) {
    return NextResponse.json({ error: "Shop not found", code: "not_found" }, { status: 404 });
  }

  // This endpoint is public/unauthenticated (the customer wizard never sends
  // excludeBookingId — only the dashboard's reschedule picker does), so an
  // anonymous caller could otherwise pass an arbitrary booking id here to get
  // back availability with that booking's slot artificially freed up. Scope
  // it to the resolved vendor and silently ignore it if it doesn't match,
  // rather than trusting it just because only one legitimate caller exists today.
  let excludeBookingId = parsed.data.excludeBookingId;
  if (excludeBookingId) {
    const owned = await db.booking.findFirst({
      where: { id: excludeBookingId, vendorId: vendor.id },
      select: { id: true },
    });
    if (!owned) excludeBookingId = undefined;
  }

  const slots = await getAvailableSlots({
    vendorId: vendor.id,
    date: parsed.data.date,
    durationMinutes: parsed.data.durationMinutes,
    staffId: parsed.data.staffId,
    excludeBookingId,
  });

  return NextResponse.json({ slots });
}
