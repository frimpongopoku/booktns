import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { generateOrderSlug, generateOrderRef } from "@/lib/slugs";
import { serializeOrder } from "@/lib/serialize";

const createSchema = z.object({
  vendorSlug: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z.string().trim().min(1, "Phone number is required"),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Your cart is empty"),
  paymentMethodId: z.string().trim().nullable().optional(),
  deliveryPreference: z.enum(["Pickup", "Delivery"]),
  notes: z.string().trim().optional(),
});

const MAX_REF_ATTEMPTS = 5;

// Public, unauthenticated — guest checkout. No requireRole gate; every write
// is instead scoped/verified against the vendor resolved from `vendorSlug`.
export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
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

  const productIds = parsed.data.items.map((item) => item.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds }, vendorId: vendor.id, active: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: "One or more items in your cart are no longer available", code: "invalid_request" },
        { status: 400 }
      );
    }
    if (item.quantity > product.stockCount) {
      return NextResponse.json(
        { error: `Only ${product.stockCount} of "${product.name}" left in stock`, code: "invalid_request" },
        { status: 400 }
      );
    }
  }

  if (parsed.data.paymentMethodId) {
    const paymentMethod = await db.paymentMethod.findFirst({
      where: { id: parsed.data.paymentMethodId, vendorId: vendor.id, active: true },
      select: { id: true },
    });
    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found", code: "not_found" }, { status: 400 });
    }
  }

  const normalizedPhone = normalizePhone(parsed.data.customerPhone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid phone number", code: "invalid_request" }, { status: 400 });
  }

  const totalPesewas = parsed.data.items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + product.priceInPesewas * item.quantity;
  }, 0);

  const orderItems = parsed.data.items.map((item) => {
    const product = productMap.get(item.productId)!;
    return { productId: product.id, name: product.name, priceSnapshot: product.priceInPesewas, quantity: item.quantity };
  });

  for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt++) {
    try {
      const order = await db.order.create({
        data: {
          vendorId: vendor.id,
          slug: generateOrderSlug(),
          ref: generateOrderRef(),
          customerName: parsed.data.customerName,
          customerPhone: normalizedPhone,
          notes: parsed.data.notes ?? "",
          deliveryPreference: parsed.data.deliveryPreference,
          paymentMethodId: parsed.data.paymentMethodId || null,
          totalPesewas,
          items: { create: orderItems },
        },
        include: { items: true, paymentMethod: true },
      });
      return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
    } catch (err) {
      const isRefConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (isRefConflict && attempt < MAX_REF_ATTEMPTS - 1) continue;
      throw err;
    }
  }

  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "server_error" }, { status: 500 });
}

// Dashboard order list — vendor-scoped, staff-authenticated.
export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const orders = await db.order.findMany({
    where: { vendorId: auth.session.vendorId },
    include: { items: true, paymentMethod: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders: orders.map(serializeOrder) });
}
