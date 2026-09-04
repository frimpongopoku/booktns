import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import ProductsClient from "@/components/dashboard/ProductsClient";
import type { Product } from "@/types";

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

  const [{ products, nextCursor }, { names: lowStockProductNames }] = await Promise.all([
    apiServer<{ products: Product[]; nextCursor: string | null }>("/products"),
    apiServer<{ names: string[] }>("/products/low-stock"),
  ]);

  return (
    <ProductsClient
      initialProducts={products}
      initialNextCursor={nextCursor}
      lowStockProductNames={lowStockProductNames}
    />
  );
}
