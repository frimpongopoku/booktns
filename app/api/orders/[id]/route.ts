import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeOrder } from "@/lib/serialize";

const ORDER_STATUSES = ["new", "processing", "ready", "completed", "cancelled"] as const;

const updateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
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

  const existing = await db.order.findFirst({
    where: { id, vendorId: auth.session.vendorId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found", code: "not_found" }, { status: 404 });
  }

  const order = await db.order.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { items: true, paymentMethod: true },
  });

  return NextResponse.json({ order: serializeOrder(order) });
}
