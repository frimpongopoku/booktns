import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dayEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z.string().regex(TIME_REGEX, "Time must be in HH:MM format").nullable(),
    closeTime: z.string().regex(TIME_REGEX, "Time must be in HH:MM format").nullable(),
  })
  .refine((day) => day.isClosed || (day.openTime && day.closeTime), {
    message: "Open and close time are required unless the day is marked closed",
  })
  .refine((day) => day.isClosed || !day.openTime || !day.closeTime || day.openTime < day.closeTime, {
    message: "Open time must be before close time",
  });

const updateSchema = z
  .object({ days: z.array(dayEntrySchema).length(7, "All 7 days must be included") })
  .refine((body) => new Set(body.days.map((d) => d.dayOfWeek)).size === 7, {
    message: "Each day of the week must appear exactly once",
  });

export async function GET() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const days = await db.businessHours.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ days });
}

export async function PATCH(request: Request) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const vendorId = auth.session.vendorId;
  const days = await db.$transaction(
    parsed.data.days.map((day) =>
      db.businessHours.upsert({
        where: { vendorId_dayOfWeek: { vendorId, dayOfWeek: day.dayOfWeek } },
        create: {
          vendorId,
          dayOfWeek: day.dayOfWeek,
          isClosed: day.isClosed,
          openTime: day.isClosed ? null : day.openTime,
          closeTime: day.isClosed ? null : day.closeTime,
        },
        update: {
          isClosed: day.isClosed,
          openTime: day.isClosed ? null : day.openTime,
          closeTime: day.isClosed ? null : day.closeTime,
        },
      })
    )
  );

  return NextResponse.json({ days });
}
