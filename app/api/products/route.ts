import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative"),
  stockCount: z.number().int().nonnegative("Stock count cannot be negative"),
  lowStockThreshold: z.number().int().nonnegative("Low-stock threshold cannot be negative"),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().nullable().optional(),
  featured: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const products = await db.product.findMany({
    where: { vendorId: auth.session.vendorId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ products: products.map(serializeProduct) });
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

  const product = await db.product.create({
    data: {
      vendorId: auth.session.vendorId,
      name: parsed.data.name,
      priceInPesewas: parsed.data.priceInPesewas,
      stockCount: parsed.data.stockCount,
      lowStockThreshold: parsed.data.lowStockThreshold,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      featured: parsed.data.featured ?? false,
    },
  });

  return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
}
