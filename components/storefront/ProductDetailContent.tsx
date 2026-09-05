"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/data";
import type { Product } from "@/types";
import { ShoppingBag, Plus, Minus, Check } from "lucide-react";

interface ProductDetailContentProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  // True when rendered inside the quick-view modal — stacked layout instead
  // of the full page's side-by-side gallery/details grid.
  compact?: boolean;
  // The quick-view modal needs "h2" (the shop page already has its own h1);
  // the standalone product page needs "h1" — the product name is its primary
  // heading and was previously always an h2, even there.
  headingLevel?: "h1" | "h2";
}

export default function ProductDetailContent({
  product,
  onAddToCart,
  compact = false,
  headingLevel: HeadingTag = "h2",
}: ProductDetailContentProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const images = product.images;
  const outOfStock = product.stockCount === 0;
  const isLow = !outOfStock && product.stockCount <= product.lowStockThreshold;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className={compact ? "flex flex-col gap-4" : "grid md:grid-cols-2 gap-8"}>
      {/* Gallery */}
      <div className="flex flex-col gap-2">
        <div
          className="aspect-square rounded-[var(--rl)] overflow-hidden flex items-center justify-center"
          style={{ background: "var(--bg3)" }}
        >
          {images[selectedImage] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[selectedImage].url} alt={product.name} className="w-full h-full object-cover object-top" />
          ) : (
            <ShoppingBag size={48} style={{ color: "var(--tx3)" }} />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(i)}
                className="w-14 h-14 rounded-[var(--r)] overflow-hidden flex-shrink-0"
                style={{ outline: selectedImage === i ? "2px solid var(--ac)" : "2px solid transparent", outlineOffset: "1px" }}
                aria-label={`Show photo ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover object-top" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-3">
        {isLow && (
          <span
            className="w-fit text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
          >
            Low stock
          </span>
        )}
        {outOfStock && (
          <span
            className="w-fit text-xs font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--bg3)", color: "var(--tx3)" }}
          >
            Out of stock
          </span>
        )}
        <HeadingTag
          className="font-display text-xl font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          {product.name}
        </HeadingTag>
        <p className="text-lg font-semibold" style={{ color: "var(--ac)" }}>
          {formatPrice(product.priceInPesewas)}
        </p>
        {product.description && (
          <p className="text-base leading-relaxed" style={{ color: "var(--tx2)" }}>
            {product.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={outOfStock}
              className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
              style={{ background: "var(--bg3)", color: "var(--tx)" }}
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-base font-semibold" style={{ color: "var(--tx)" }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(product.stockCount, q + 1))}
              disabled={outOfStock}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-50"
              style={{ background: "var(--ac)" }}
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="flex-1 py-2.5 rounded-[var(--r)] text-base font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--ac)" }}
          >
            {added ? (
              <>
                <Check size={14} /> Added
              </>
            ) : (
              "Add to cart"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
