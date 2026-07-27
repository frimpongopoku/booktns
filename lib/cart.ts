import type { CartItem, Product } from "@/types";

// Shared cart storage — read/written from both ShopClient.tsx (the shop grid
// + cart drawer) and ProductDetailContent.tsx (the quick-view modal and the
// full product page), which don't share any React state since the product
// page is a separate route/navigation. Scoped per vendor slug so browsing
// multiple vendors' shops never mixes carts. Persists until an order is
// actually submitted (see ShopClient's checkout submit handler) — not the
// v1 default described in the spec, overridden per product decision.
function storageKey(vendorSlug: string): string {
  return `booktns_cart_${vendorSlug}`;
}

export function getCart(vendorSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(vendorSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCart(vendorSlug: string, items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(vendorSlug), JSON.stringify(items));
  } catch {
    // Quota exceeded or private-mode storage — cart just won't persist.
  }
}

export function clearCart(vendorSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(vendorSlug));
  } catch {
    // Ignore — worst case the cart reappears, harmless.
  }
}

export function addItem(vendorSlug: string, product: Product, quantity = 1): CartItem[] {
  const current = getCart(vendorSlug);
  const existing = current.find((c) => c.productId === product.id);
  const next = existing
    ? current.map((c) => (c.productId === product.id ? { ...c, quantity: c.quantity + quantity } : c))
    : [...current, { productId: product.id, name: product.name, price: product.priceInPesewas, quantity }];
  setCart(vendorSlug, next);
  return next;
}
