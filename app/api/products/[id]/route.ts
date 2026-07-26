import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative").optional(),
  stockCount: z.number().int().nonnegative("Stock count cannot be negative").optional(),
  lowStockThreshold: z.number().int().nonnegative("Low-stock threshold cannot be negative").optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().nullable().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
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

  const existing = await db.product.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found", code: "not_found" }, { status: 404 });
  }

  const product = await db.product.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ product: serializeProduct(product) });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const existing = await db.product.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Product not found", code: "not_found" }, { status: 404 });
  }

  // Soft delete only, per CLAUDE.md data rules — never hard delete.
  const product = await db.product.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ product: serializeProduct(product) });
}
