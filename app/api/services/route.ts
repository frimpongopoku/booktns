import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeService } from "@/lib/serialize";

const SERVICE_CATEGORIES = ["Hair", "Nails", "Skin", "Lashes", "Brows", "Other"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.enum(SERVICE_CATEGORIES),
  durationMinutes: z.number().int().positive("Duration must be a positive number of minutes"),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative"),
  description: z.string().trim().optional(),
  featured: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const services = await db.service.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ services: services.map(serializeService) });
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

  const highestOrder = await db.service.aggregate({
    where: { vendorId: auth.session.vendorId },
    _max: { displayOrder: true },
  });

  const service = await db.service.create({
    data: {
      vendorId: auth.session.vendorId,
      name: parsed.data.name,
      category: parsed.data.category,
      durationMinutes: parsed.data.durationMinutes,
      priceInPesewas: parsed.data.priceInPesewas,
      description: parsed.data.description,
      featured: parsed.data.featured ?? false,
      displayOrder: (highestOrder._max.displayOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ service: serializeService(service) }, { status: 201 });
}
