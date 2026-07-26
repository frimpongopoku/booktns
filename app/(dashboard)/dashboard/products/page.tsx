import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeProduct } from "@/lib/serialize";
import ProductsClient from "@/components/dashboard/ProductsClient";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "Service") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
        style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>You don&apos;t have access to this page</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
          Managing products is limited to owners and management staff.
        </p>
      </div>
    );
  }

  // Keep in sync with PAGE_SIZE in app/api/products/route.ts — this is the
  // same first page the client would get from GET /api/products, fetched
  // directly to avoid a redundant round-trip on initial page load.
  const PAGE_SIZE = 24;
  const [page, stockLevels] = await Promise.all([
    db.product.findMany({
      where: { vendorId: session.vendorId, active: true },
      include: { images: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: PAGE_SIZE + 1,
    }),
    // Deliberately not paginated — a slim scalar-only projection so the
    // low-stock warning banner can scan the vendor's whole catalog (not just
    // whatever page happens to be loaded) without the cost of fetching every
    // product's full record (description, images, etc).
    db.product.findMany({
      where: { vendorId: session.vendorId, active: true },
      select: { name: true, stockCount: true, lowStockThreshold: true },
    }),
  ]);

  const hasMore = page.length > PAGE_SIZE;
  const products = page.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? products[products.length - 1].id : null;

  const lowStockProductNames = stockLevels
    .filter((p) => p.stockCount > 0 && p.stockCount <= p.lowStockThreshold)
    .map((p) => p.name);

  return (
    <ProductsClient
      initialProducts={products.map(serializeProduct)}
      initialNextCursor={nextCursor}
      lowStockProductNames={lowStockProductNames}
    />
  );
}
