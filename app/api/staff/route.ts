import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeStaff } from "@/lib/serialize";
import { Prisma } from "@/lib/generated/prisma/client";

const STAFF_ROLES = ["Owner", "Management", "Service"] as const;
const SERVICE_CATEGORIES = ["Hair", "Nails", "Skin", "Lashes", "Brows", "Other"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().optional(),
  role: z.enum(STAFF_ROLES),
  roleDetail: z.string().trim().optional(),
  botAccess: z.boolean().optional(),
  serviceCategories: z.array(z.enum(SERVICE_CATEGORIES)).optional(),
});

export async function GET() {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const staff = await db.staff.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ staff: staff.map(serializeStaff) });
}

export async function POST(request: Request) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request", code: "invalid_request" },
      { status: 400 }
    );
  }

  try {
    const staff = await db.staff.create({
      data: {
        vendorId: auth.session.vendorId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        role: parsed.data.role,
        roleDetail: parsed.data.roleDetail,
        botAccess: parsed.data.botAccess ?? false,
        serviceCategories: parsed.data.serviceCategories ?? [],
      },
    });

    return NextResponse.json({ staff: serializeStaff(staff) }, { status: 201 });
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
