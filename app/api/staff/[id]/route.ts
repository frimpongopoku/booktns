import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeStaff } from "@/lib/serialize";
import { Prisma } from "@/lib/generated/prisma/client";

const STAFF_ROLES = ["Owner", "Management", "Service"] as const;
const SERVICE_CATEGORIES = ["Hair", "Nails", "Skin", "Lashes", "Brows", "Other"] as const;

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().email("Enter a valid email address").optional(),
  phone: z.string().trim().optional(),
  role: z.enum(STAFF_ROLES).optional(),
  roleDetail: z.string().trim().optional(),
  botAccess: z.boolean().optional(),
  active: z.boolean().optional(),
  serviceCategories: z.array(z.enum(SERVICE_CATEGORIES)).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  const existing = await db.staff.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Staff member not found", code: "not_found" }, { status: 404 });
  }

  try {
    const staff = await db.staff.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email?.toLowerCase(),
      },
    });

    return NextResponse.json({ staff: serializeStaff(staff) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "That email is already registered to another staff account.", code: "duplicate_email" },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await db.staff.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Staff member not found", code: "not_found" }, { status: 404 });
  }

  // Soft delete only — deactivate rather than remove the record.
  const staff = await db.staff.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ staff: serializeStaff(staff) });
}
