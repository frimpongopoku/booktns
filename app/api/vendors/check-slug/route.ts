import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const querySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+$/, "Slug must be lowercase letters and numbers only"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ slug: searchParams.get("slug") ?? "" });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid slug format", code: "invalid_request" }, { status: 400 });
  }

  const existing = await db.vendor.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
