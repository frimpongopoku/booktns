import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { serializeProduct } from "@/lib/serialize";
import { slugifyProductName, dedupeSlug } from "@/lib/slugs";

const MAX_IMAGES_PER_PRODUCT = 5;
// Matches the media gallery's page size for a consistent infinite-scroll feel across the dashboard.
const PAGE_SIZE = 24;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  priceInPesewas: z.number().int().nonnegative("Price cannot be negative"),
  stockCount: z.number().int().nonnegative("Stock count cannot be negative"),
  lowStockThreshold: z.number().int().nonnegative("Low-stock threshold cannot be negative"),
  description: z.string().trim().optional(),
  images: z.array(z.string().trim().url()).max(MAX_IMAGES_PER_PRODUCT, `Up to ${MAX_IMAGES_PER_PRODUCT} photos per product`).optional(),
  featured: z.boolean().optional(),
});

export async function GET(request: Request) {
  const auth = await requireRole(["Owner", "Management"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const search = searchParams.get("search")?.trim();

  const where = {
    vendorId: auth.session.vendorId,
    active: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const page = await db.product.findMany({
    where,
    include: { images: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = page.length > PAGE_SIZE;
  const items = page.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ products: items.map(serializeProduct), nextCursor });
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

  const existingSlugs = await db.product.findMany({
    where: { vendorId: auth.session.vendorId },
    select: { slug: true },
  });
  const slug = dedupeSlug(slugifyProductName(parsed.data.name), new Set(existingSlugs.map((p) => p.slug)));

  const product = await db.product.create({
    data: {
      vendorId: auth.session.vendorId,
      name: parsed.data.name,
      slug,
      priceInPesewas: parsed.data.priceInPesewas,
      stockCount: parsed.data.stockCount,
      lowStockThreshold: parsed.data.lowStockThreshold,
      description: parsed.data.description,
      featured: parsed.data.featured ?? false,
      images: {
        create: (parsed.data.images ?? []).map((url, displayOrder) => ({ url, displayOrder })),
      },
    },
    include: { images: true },
  });

  return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
}
