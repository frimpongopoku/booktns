"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { X } from "lucide-react";
import ProductDetailContent from "@/components/storefront/ProductDetailContent";
import { storefrontHref } from "@/lib/storefront-links";

interface ProductQuickViewModalProps {
  product: Product;
  vendorSlug: string;
  isCustomDomain: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function ProductQuickViewModal({ product, vendorSlug, isCustomDomain, onClose, onAddToCart }: ProductQuickViewModalProps) {
  const [isExiting, setIsExiting] = useState(false);
  const close = () => {
    setIsExiting(true);
    setTimeout(onClose, 210);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 anim-fade-in"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={close}
    >
      <div
        className={`w-full max-w-md max-h-[85vh] flex flex-col rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>Quick view</h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <ProductDetailContent product={product} onAddToCart={onAddToCart} compact />
        </div>

        <div className="p-5 flex-shrink-0" style={{ borderTop: "1px solid var(--bd)" }}>
          <Link
            href={storefrontHref(vendorSlug, isCustomDomain, `/shop/${product.slug}`)}
            className="w-full block text-center py-2.5 rounded-[var(--r)] text-sm font-medium"
            style={{ background: "var(--bg2)", color: "var(--tx)" }}
            onClick={close}
          >
            View full details
          </Link>
        </div>
      </div>
    </div>
  );
}
