"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/data";
import { apiPublic, ApiError } from "@/lib/api-client";
import { getCart, setCart as persistCart, clearCart } from "@/lib/cart";
import { captureEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import type { Product, CartItem, PaymentMethod, OrderDeliveryPreference } from "@/types";
import { ShoppingBag, Plus, Minus, X, ShoppingCart, ArrowLeft } from "lucide-react";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";
import VendorWordmark from "@/components/storefront/VendorWordmark";
import ProductQuickViewModal from "@/components/storefront/ProductQuickViewModal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { storefrontHref } from "@/lib/storefront-links";

interface ShopClientProps {
  slug: string;
  vendorName: string;
  vendorLogoUrl?: string;
  products: Product[];
  paymentMethods: PaymentMethod[];
  isCustomDomain: boolean;
  // Passed as a node rather than as vendor props so the footer stays a
  // Server Component — this page's client bundle has no reason to carry the
  // vendor's owner details or the markup that renders them.
  footer: ReactNode;
}

const FILTERS = ["All", "Hair", "Skin", "Nails"] as const;
type Filter = (typeof FILTERS)[number];

type DrawerView = "cart" | "checkout";

export default function ShopClient({ slug, vendorName, vendorLogoUrl, products, paymentMethods, isCustomDomain, footer }: ShopClientProps) {
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<DrawerView>("cart");
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryPreference, setDeliveryPreference] = useState<OrderDeliveryPreference>("Pickup");
  const [notes, setNotes] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cart persists across navigation/refresh (per product decision — not the
  // v1 default described in the spec) until the order is actually submitted.
  // Shared with the product detail page via lib/cart.ts, since there's no
  // React state connecting the two across a real navigation.
  useEffect(() => {
    setCart(getCart(slug));
    setCartHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!cartHydrated) return;
    persistCart(slug, cart);
  }, [cart, cartHydrated, slug]);

  const filtered = products.filter((p) => {
    if (filter === "All") return true;
    // Infer category from product name (demo only)
    const name = p.name.toLowerCase();
    if (filter === "Hair") return name.includes("hair") || name.includes("curl");
    if (filter === "Skin") return name.includes("serum") || name.includes("toner") || name.includes("moistur");
    if (filter === "Nails") return name.includes("nail");
    return true;
  });

  const addToCart = (product: Product, quantity = 1) => {
    captureEvent(ANALYTICS_EVENTS.addedToCart, {
      vendor_slug: slug,
      product_slug: product.slug,
      quantity,
      price_pesewas: product.priceInPesewas,
    });
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + quantity } : c
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.priceInPesewas, quantity }];
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

  const openCheckout = () => {
    captureEvent(ANALYTICS_EVENTS.checkoutStarted, {
      vendor_slug: slug,
      item_count: cartCount,
      distinct_products: cart.length,
      total_pesewas: cartTotal,
    });
    setError(null);
    setView("checkout");
  };

  const handleSubmitOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || cart.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      // Guest checkout — public and unauthenticated — goes straight to the
      // NestJS API rather than through the BFF proxy, which exists to
      // attach a session this request doesn't have.
      const { order } = await apiPublic<{ order: { slug: string } }>("/orders", {
        method: "POST",
        body: {
          vendorSlug: slug,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          paymentMethodId: paymentMethodId ?? undefined,
          deliveryPreference,
          notes: notes.trim() || undefined,
        },
      });

      // Cart shape only — never the customer's name or phone number.
      captureEvent(ANALYTICS_EVENTS.orderSubmitted, {
        vendor_slug: slug,
        item_count: cart.reduce((n, item) => n + item.quantity, 0),
        distinct_products: cart.length,
        total_pesewas: cartTotal,
        delivery_preference: deliveryPreference,
      });

      clearCart(slug);
      setCart([]);
      router.push(`/order/${order.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-0" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 sticky top-0 z-30"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <VendorWordmark name={vendorName} href={storefrontHref(slug, isCustomDomain)} logoUrl={vendorLogoUrl} />
        <div className="flex items-center gap-3">
          <Link href={storefrontHref(slug, isCustomDomain, "/book")} className="text-sm font-medium hidden md:block" style={{ color: "var(--tx2)" }}>
            Book
          </Link>
          <button
            onClick={() => { setView("cart"); setCartOpen(true); }}
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

        {/* Filter tabs — commented out for now, category is inferred from the
            product name rather than a real field, so it's not reliable yet.
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
        */}

        {/* Products grid */}
        {filtered.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "var(--tx3)" }}>
            {products.length === 0 ? "No products in the shop yet." : "No products match this filter."}
          </p>
        ) : (
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
                <button
                  onClick={() => setQuickViewProduct(product)}
                  className="w-full aspect-square flex items-center justify-center relative"
                  style={{ background: "var(--bg3)" }}
                  aria-label={`Quick view ${product.name}`}
                >
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <ShoppingBag size={32} style={{ color: "var(--tx3)" }} />
                  )}
                </button>

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
                  <button
                    onClick={() => setQuickViewProduct(product)}
                    className="block w-full text-sm font-medium mt-1 mb-1 text-left hover:underline"
                    style={{ color: "var(--tx)" }}
                  >
                    {product.name}
                  </button>
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
        )}
      </div>

      {/* Cart sticky footer on mobile */}
      {cartCount > 0 && (
        <div
          className="md:hidden fixed bottom-16 left-0 right-0 px-4 py-3 z-30"
          style={{ background: "var(--bg)", borderTop: "1px solid var(--bd)" }}
        >
          <button
            onClick={() => { setView("cart"); setCartOpen(true); }}
            className="w-full flex items-center justify-between px-5 py-3 rounded-[var(--r)] text-white"
            style={{ background: "var(--ac)" }}
          >
            <span className="text-sm font-medium">{cartCount} item{cartCount > 1 ? "s" : ""} in cart</span>
            <span className="text-sm font-semibold">{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart / checkout sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 cursor-pointer" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setCartOpen(false)} />
          <div
            className="w-full max-w-sm flex flex-col"
            style={{ background: "var(--bg)", borderLeft: "1px solid var(--bd)" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
              <div className="flex items-center gap-2">
                {view === "checkout" && (
                  <button onClick={() => setView("cart")} className="p-1 -ml-1 rounded-full hover:bg-[var(--bg3)]" style={{ color: "var(--tx3)" }} aria-label="Back to cart">
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h2 className="font-display font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
                  {view === "cart" ? `Your Cart (${cartCount})` : "Checkout"}
                </h2>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-full hover:bg-[var(--bg3)]" style={{ color: "var(--tx3)" }}>
                <X size={16} />
              </button>
            </div>

            {view === "cart" ? (
              <>
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
                    <button
                      onClick={openCheckout}
                      className="w-full block text-center py-3 rounded-[var(--r)] text-white text-sm font-medium"
                      style={{ background: "var(--ac)" }}
                    >
                      Checkout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                  {error && (
                    <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
                      {error}
                    </div>
                  )}

                  <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span style={{ color: "var(--tx2)" }}>{cartCount} item{cartCount > 1 ? "s" : ""}</span>
                      <span className="font-semibold" style={{ color: "var(--tx)" }}>{formatPrice(cartTotal)}</span>
                    </div>
                  </div>

                  <Input label="Your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" />
                  <Input label="WhatsApp number" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 0244 123 456" />

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Pickup or delivery?</label>
                    <div className="flex gap-2">
                      {(["Pickup", "Delivery"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setDeliveryPreference(opt)}
                          className="flex-1 py-2 rounded-[var(--r)] text-sm font-medium"
                          style={{
                            background: deliveryPreference === opt ? "var(--ac)" : "var(--bg2)",
                            color: deliveryPreference === opt ? "white" : "var(--tx2)",
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethods.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Payment method</label>
                      <div className="flex flex-col gap-2">
                        {paymentMethods.map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethodId(pm.id)}
                            className="flex items-center justify-between p-3 rounded-[var(--r)] text-left"
                            style={{
                              background: paymentMethodId === pm.id ? "var(--ac-bg)" : "var(--bg2)",
                              border: `1px solid ${paymentMethodId === pm.id ? "var(--ac)" : "var(--bds)"}`,
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{pm.label}</p>
                              <p className="text-xs" style={{ color: "var(--tx3)" }}>{pm.accountName}</p>
                            </div>
                            <div
                              className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                              style={{
                                borderColor: paymentMethodId === pm.id ? "var(--ac)" : "var(--bd)",
                                background: paymentMethodId === pm.id ? "var(--ac)" : "transparent",
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything the vendor should know" />
                </div>

                <div className="p-5" style={{ borderTop: "1px solid var(--bd)" }}>
                  <Button
                    loading={submitting}
                    disabled={!customerName.trim() || !customerPhone.trim()}
                    onClick={handleSubmitOrder}
                    className="w-full"
                  >
                    Place Order
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {footer}

      <MobileStorefrontNav slug={slug} isCustomDomain={isCustomDomain} />

      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          vendorSlug={slug}
          isCustomDomain={isCustomDomain}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={(product, quantity) => addToCart(product, quantity)}
        />
      )}
    </div>
  );
}
