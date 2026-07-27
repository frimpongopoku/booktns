"use client";

import { addItem } from "@/lib/cart";
import type { Product } from "@/types";
import ProductDetailContent from "@/components/storefront/ProductDetailContent";

interface ProductPageClientProps {
  product: Product;
  vendorSlug: string;
}

// Thin client wrapper bridging the server page (data-fetching + metadata) to
// the interactive detail content — a Server Component can't pass a function
// prop like onAddToCart directly to a Client Component.
export default function ProductPageClient({ product, vendorSlug }: ProductPageClientProps) {
  return (
    <ProductDetailContent
      product={product}
      onAddToCart={(p, quantity) => addItem(vendorSlug, p, quantity)}
    />
  );
}
