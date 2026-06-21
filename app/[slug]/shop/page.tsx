"use client";

import { useState, use } from "react";
import Link from "next/link";
import { products, formatPrice } from "@/lib/data";
import type { Product, CartItem } from "@/types";
import { ShoppingBag, Plus, Minus, X, ShoppingCart } from "lucide-react";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const FILTERS = ["All", "Hair", "Skin", "Nails"] as const;
type Filter = (typeof FILTERS)[number];

export default function ShopPage({ params }: PageProps) {
  const { slug } = use(params);
  const [filter, setFilter] = useState<Filter>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = products.filter((p) => {
    if (filter === "All") return true;
    // Infer category from product name (demo only)
    const name = p.name.toLowerCase();
    if (filter === "Hair") return name.includes("hair") || name.includes("curl");
    if (filter === "Skin") return name.includes("serum") || name.includes("toner") || name.includes("moistur");
    if (filter === "Nails") return name.includes("nail");
    return true;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.priceInPesewas, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c))
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const getQty = (productId: string) => cart.find((c) => c.productId === productId)?.quantity ?? 0;

  return (
    <div className="min-h-screen pb-24 md:pb-0" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 sticky top-0 z-30"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <Link
          href={`/${slug}`}
          className="font-display text-lg font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          Glam by Rose
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/${slug}/book`} className="text-sm font-medium hidden md:block" style={{ color: "var(--tx2)" }}>
            Book
          </Link>
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--r)] text-sm font-medium relative"
            style={{ background: "var(--bg2)", color: "var(--tx)" }}
          >
            <ShoppingCart size={16} />
            {cartCount > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: "var(--ac)" }}
              >
                {cartCount}
              </span>
            )}
            {cartCount === 0 && <span>Cart</span>}
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
        <h1
          className="font-display text-2xl font-medium mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          Shop
        </h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                background: filter === f ? "var(--ac)" : "var(--bg2)",
                color: filter === f ? "white" : "var(--tx2)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const qty = getQty(product.id);
            const isLow = product.stockCount <= product.lowStockThreshold;
            return (
              <div
                key={product.id}
                className="rounded-[var(--rl)] overflow-hidden"
                style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
              >
                {/* Image */}
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{ background: "var(--bg3)" }}
                >
                  <ShoppingBag size={32} style={{ color: "var(--tx3)" }} />
                </div>

                {/* Info */}
                <div className="p-3">
                  {isLow && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
                    >
                      Low stock
                    </span>
                  )}
                  <p className="text-sm font-medium mt-1 mb-1" style={{ color: "var(--tx)" }}>
                    {product.name}
                  </p>
                  <p className="text-sm font-semibold mb-3" style={{ color: "var(--ac)" }}>
                    {formatPrice(product.priceInPesewas)}
                  </p>

                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(product.id, qty - 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: "var(--bg3)", color: "var(--tx)" }}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="flex-1 text-center text-sm font-semibold" style={{ color: "var(--tx)" }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{ background: "var(--ac)" }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full py-2 rounded-[var(--r)] text-xs font-medium transition-colors"
                      style={{ background: "var(--bg3)", color: "var(--tx2)" }}
                    >
                      Add to cart
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart sticky footer on mobile */}
      {cartCount > 0 && (
        <div
          className="md:hidden fixed bottom-16 left-0 right-0 px-4 py-3 z-30"
          style={{ background: "var(--bg)", borderTop: "1px solid var(--bd)" }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between px-5 py-3 rounded-[var(--r)] text-white"
            style={{ background: "var(--ac)" }}
          >
            <span className="text-sm font-medium">{cartCount} item{cartCount > 1 ? "s" : ""} in cart</span>
            <span className="text-sm font-semibold">{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 cursor-pointer" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setCartOpen(false)} />
          <div
            className="w-full max-w-sm flex flex-col"
            style={{ background: "var(--bg)", borderLeft: "1px solid var(--bd)" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
              <h2 className="font-display font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
                Your Cart ({cartCount})
              </h2>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-full hover:bg-[var(--bg3)]" style={{ color: "var(--tx3)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: "var(--tx3)" }}>Your cart is empty</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 p-3 rounded-[var(--r)]"
                      style={{ background: "var(--bg2)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--tx3)" }}>{formatPrice(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--bg3)", color: "var(--tx)" }}>
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center text-sm" style={{ color: "var(--tx)" }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "var(--ac)" }}>
                          <Plus size={10} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} style={{ color: "var(--tx3)" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5" style={{ borderTop: "1px solid var(--bd)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>Total</span>
                  <span className="font-display text-xl font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
                    {formatPrice(cartTotal)}
                  </span>
                </div>
                <Link
                  href={`/${slug}/pay`}
                  className="w-full block text-center py-3 rounded-[var(--r)] text-white text-sm font-medium"
                  style={{ background: "var(--ac)" }}
                  onClick={() => setCartOpen(false)}
                >
                  Checkout → View Payment Details
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <MobileStorefrontNav slug={slug} />
    </div>
  );
}
