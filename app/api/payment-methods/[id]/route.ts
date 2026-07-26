import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializePaymentMethod } from "@/lib/serialize";

const PAYMENT_METHOD_TYPES = ["momo", "bank", "cash"] as const;

const updateSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES).optional(),
  label: z.string().trim().min(1, "Label is required").optional(),
  accountName: z.string().trim().min(1, "Account name is required").optional(),
  accountNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  network: z.string().trim().optional(),
  active: z.boolean().optional(),
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

  const existing = await db.paymentMethod.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Payment method not found", code: "not_found" }, { status: 404 });
  }

  const method = await db.paymentMethod.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ paymentMethod: serializePaymentMethod(method) });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await db.paymentMethod.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Payment method not found", code: "not_found" }, { status: 404 });
  }

  // Soft delete only, per CLAUDE.md data rules — never hard delete.
  const method = await db.paymentMethod.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ paymentMethod: serializePaymentMethod(method) });
}
