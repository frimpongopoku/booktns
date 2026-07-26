import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeProduct, serializeMedia } from "@/lib/serialize";
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

  const [products, media] = await Promise.all([
    db.product.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { name: "asc" },
    }),
    db.media.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <ProductsClient
      initialProducts={products.map(serializeProduct)}
      initialMedia={media.map(serializeMedia)}
    />
  );
}
