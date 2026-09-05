"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/data";
import { apiBrowser, ApiError } from "@/lib/api-client";
import type { Product } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MediaPickerModal from "@/components/dashboard/MediaPickerModal";
import { Plus, X, AlertTriangle, Package, Archive, ArchiveRestore, ImagePlus, Search, Star } from "lucide-react";

const MAX_IMAGES_PER_PRODUCT = 5;

function getStockBadge(p: Product) {
  if (p.stockCount === 0) return <Badge variant="out">Out of stock</Badge>;
  if (p.stockCount <= p.lowStockThreshold) return <Badge variant="low">Low stock</Badge>;
  return <Badge variant="active">{p.stockCount} in stock</Badge>;
}

interface ProductModalProps {
  product?: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}

function ProductModal({ product, onClose, onSaved }: ProductModalProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String((product?.priceInPesewas ?? 0) / 100));
  const [stock, setStock] = useState(String(product?.stockCount ?? ""));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.lowStockThreshold ?? 5));
  const [description, setDescription] = useState(product?.description ?? "");
  const [images, setImages] = useState<string[]>(product?.images.map((img) => img.url) ?? []);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setLoading(true);
    setError(null);

    const body = {
      name: name.trim(),
      priceInPesewas: Math.round(parseFloat(price) * 100) || 0,
      stockCount: parseInt(stock) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 0,
      description: description.trim() || undefined,
      images,
      featured,
    };

    try {
      const { product: saved } = await apiBrowser<{ product: Product }>(
        product ? `/products/${product.id}` : "/products",
        { method: product ? "PATCH" : "POST", body },
      );
      onSaved(saved);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className={`w-full max-w-md rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>
            {product ? "Edit Product" : "Add Product"}
          </h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
              Photos ({images.length}/{MAX_IMAGES_PER_PRODUCT})
            </label>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-[var(--r)] overflow-hidden flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover object-top" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                    aria-label="Remove photo"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES_PER_PRODUCT && (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="w-16 h-16 rounded-[var(--r)] flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-colors hover:bg-[var(--bg3)]"
                  style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
                >
                  <ImagePlus size={16} style={{ color: "var(--tx3)" }} />
                </button>
              )}
              {images.length === 0 && (
                <div className="w-16 h-16 rounded-[var(--r)] flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                  <Package size={18} style={{ color: "var(--tx3)" }} />
                </div>
              )}
            </div>
          </div>
          <Input label="Product name" placeholder="e.g. Argan Hair Oil" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (GH₵)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            <Input label="Stock count" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
          </div>
          <Input
            label="Low-stock threshold"
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            placeholder="5"
            hint="You'll be warned when stock drops to or below this number"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Description (optional)</label>
            <textarea
              className="px-3 py-2 rounded-[var(--r)] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief product description…"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setFeatured((v) => !v)}
            className="flex items-center justify-between p-3 rounded-[var(--r)]"
            style={{ background: "var(--bg2)" }}
          >
            <div className="flex items-center gap-2">
              <Star size={16} style={{ color: featured ? "var(--ac)" : "var(--tx3)" }} fill={featured ? "var(--ac)" : "none"} />
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Featured</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>Highlighted on your storefront home page</p>
              </div>
            </div>
            <div
              className="w-10 h-6 rounded-full transition-colors relative flex-shrink-0"
              style={{ background: featured ? "var(--green)" : "var(--bg3)" }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ left: featured ? "calc(100% - 18px)" : "2px" }}
              />
            </div>
          </button>
        </div>
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleSave} className="flex-1" disabled={!name.trim() || !price}>
            {product ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      </div>

      {showPicker && (
        <MediaPickerModal
          selectedUrls={images}
          maxSelectable={MAX_IMAGES_PER_PRODUCT - images.length}
          onClose={() => setShowPicker(false)}
          onConfirm={(urls) => setImages((prev) => [...prev, ...urls])}
        />
      )}
    </div>
  );
}

interface ProductsClientProps {
  initialProducts: Product[];
  initialNextCursor: string | null;
  lowStockProductNames: string[];
}

type ProductView = "active" | "archived";

export default function ProductsClient({ initialProducts, initialNextCursor, lowStockProductNames }: ProductsClientProps) {
  const [view, setView] = useState<ProductView>("active");
  const [productList, setProductList] = useState<Product[]>(initialProducts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<Product | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (query: string, cursor: string | null, status: ProductView) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (cursor) params.set("cursor", cursor);
    if (status === "archived") params.set("status", "archived");
    try {
      return await apiBrowser<{ products: Product[]; nextCursor: string | null }>(`/products?${params.toString()}`);
    } catch {
      return null;
    }
  }, []);

  // Debounced search — re-fetches page one from scratch whenever the query
  // changes. Skips the very first run: `initialProducts` already covers
  // search="", view="active" on mount, so re-fetching there would just
  // duplicate that request.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const data = await fetchPage(search, null, view);
      if (cancelled || !data) return;
      setProductList(data.products);
      setNextCursor(data.nextCursor);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Switching the Active/Archived tab reloads immediately — no debounce,
  // since it's a discrete click rather than a stream of keystrokes.
  const switchView = async (next: ProductView) => {
    if (next === view) return;
    setView(next);
    setSearching(true);
    const data = await fetchPage(search, null, next);
    setSearching(false);
    if (!data) return;
    setProductList(data.products);
    setNextCursor(data.nextCursor);
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPage(search, nextCursor, view);
    if (data) {
      setProductList((prev) => [...prev, ...data.products]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, search, view, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleSaved = (p: Product) => {
    setProductList((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = p;
        return next;
      }
      return [...prev, p];
    });
  };

  const handleArchive = async (product: Product) => {
    setArchivingId(product.id);
    try {
      await apiBrowser(`/products/${product.id}`, { method: "DELETE" });
      // The list is always scoped to the current tab (active or archived),
      // so an archived product no longer belongs in the active view.
      setProductList((prev) => prev.filter((p) => p.id !== product.id));
    } catch {
      // Silent — an archive failure just leaves the product listed, no
      // dedicated error banner needed over a one-field flip.
    } finally {
      setArchivingId(null);
      setArchiving(null);
    }
  };

  const handleRestore = async (product: Product) => {
    setRestoringId(product.id);
    try {
      await apiBrowser(`/products/${product.id}`, { method: "PATCH", body: { active: true } });
      // Same rationale as handleArchive, in reverse — a restored product no
      // longer belongs in the archived view.
      setProductList((prev) => prev.filter((p) => p.id !== product.id));
    } catch {
      // Silent — a restore failure just leaves the product archived, no
      // dedicated error banner needed over a one-field flip.
    } finally {
      setRestoringId(null);
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    setTogglingFeaturedId(product.id);
    try {
      const { product: updated } = await apiBrowser<{ product: Product }>(`/products/${product.id}`, {
        method: "PATCH",
        body: { featured: !product.featured },
      });
      handleSaved(updated);
    } catch {
      // Silent, same rationale as handleArchive.
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  return (
    <div>
      <Topbar
        title="Products"
        subtitle={
          view === "archived"
            ? `${productList.length}${nextCursor ? "+" : ""} archived product${productList.length === 1 && !nextCursor ? "" : "s"}`
            : `${productList.length}${nextCursor ? "+" : ""} product${productList.length === 1 && !nextCursor ? "" : "s"}`
        }
        actions={
          <Button size="sm" onClick={() => { setEditingProduct(undefined); setShowModal(true); }}>
            <Plus size={14} />
            Add Product
          </Button>
        }
      />

      <div className="flex items-center gap-1 mb-5 p-1 rounded-[var(--r)] w-fit" style={{ background: "var(--bg2)" }}>
        {(["active", "archived"] as const).map((v) => (
          <button
            key={v}
            onClick={() => switchView(v)}
            className="px-3 py-1.5 rounded-[var(--r)] text-sm font-medium transition-colors"
            style={{
              background: view === v ? "var(--bg)" : "transparent",
              color: view === v ? "var(--tx)" : "var(--tx3)",
              boxShadow: view === v ? "var(--shadow-sm)" : "none",
            }}
          >
            {v === "active" ? "Active" : "Archived"}
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tx3)" }} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSearching(true); }}
          placeholder={view === "archived" ? "Search archived products…" : "Search products by name or description…"}
          className="w-full max-w-sm pl-9 pr-3 py-2.5 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
          style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
        />
      </div>

      {/* Low stock warning — scans the whole active catalog, not just the
          loaded page, and only matters for products customers can still buy. */}
      {view === "active" && lowStockProductNames.length > 0 && (
        <div
          className="flex items-center gap-3 p-3 rounded-[var(--r)] mb-5"
          style={{ background: "var(--amber-bg)" }}
        >
          <AlertTriangle size={16} style={{ color: "var(--amber)" }} />
          <p className="text-sm" style={{ color: "var(--amber)" }}>
            <span className="font-semibold">{lowStockProductNames.length} product{lowStockProductNames.length > 1 ? "s" : ""}</span> {lowStockProductNames.length > 1 ? "are" : "is"} running low:{" "}
            {lowStockProductNames.join(", ")}
          </p>
        </div>
      )}

      {productList.length === 0 && search.trim() && !searching ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>No products match &quot;{search}&quot;</p>
        </div>
      ) : productList.length === 0 && !searching ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
            {view === "archived" ? "No archived products" : "No products yet"}
          </p>
          <p className="text-sm max-w-xs" style={{ color: "var(--tx3)" }}>
            {view === "archived"
              ? "Products you archive show up here, and you can bring them back anytime."
              : "Add your first product so customers can shop from your storefront."}
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${searching ? "opacity-50" : ""} transition-opacity`}>
          {productList.map((product) => (
            <div
              key={product.id}
              className="rounded-[var(--rl)] overflow-hidden"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              {/* Image */}
              <div
                className="w-full aspect-[4/3] flex items-center justify-center"
                style={{ background: "var(--bg3)" }}
              >
                {product.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <Package size={32} style={{ color: "var(--tx3)" }} />
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                    {product.name}
                  </h3>
                  {getStockBadge(product)}
                </div>
                {product.description && (
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--tx3)" }}>
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p
                    className="font-display text-lg font-medium"
                    style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
                  >
                    {formatPrice(product.priceInPesewas)}
                  </p>
                  <div className="flex items-center gap-1">
                    {view === "archived" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(product)}
                        disabled={restoringId === product.id}
                      >
                        <ArchiveRestore size={14} />
                        Restore
                      </Button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleFeatured(product)}
                          disabled={togglingFeaturedId === product.id}
                          className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
                          style={{ color: product.featured ? "var(--ac)" : "var(--tx3)" }}
                          aria-label={product.featured ? `Unfeature ${product.name}` : `Feature ${product.name}`}
                          title={product.featured ? "Featured — click to unfeature" : "Mark as featured"}
                        >
                          <Star size={14} fill={product.featured ? "currentColor" : "none"} />
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingProduct(product); setShowModal(true); }}
                        >
                          Edit
                        </Button>
                        <button
                          onClick={() => setArchiving(product)}
                          disabled={archivingId === product.id}
                          className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
                          style={{ color: "var(--tx3)" }}
                          aria-label={`Archive ${product.name}`}
                        >
                          <Archive size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add new card — only in the active tab; archiving something
              archived doesn't belong next to a "create" affordance. */}
          {view === "active" && (
            <button
              onClick={() => { setEditingProduct(undefined); setShowModal(true); }}
              className="rounded-[var(--rl)] flex flex-col items-center justify-center gap-2 min-h-[200px] transition-colors hover:bg-[var(--bg3)]"
              style={{
                background: "var(--bg2)",
                border: "2px dashed var(--bds)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg3)" }}
              >
                <Plus size={20} style={{ color: "var(--tx3)" }} />
              </div>
              <p className="text-sm" style={{ color: "var(--tx3)" }}>
                Add product
              </p>
            </button>
          )}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <p className="text-center text-sm py-4" style={{ color: "var(--tx3)" }}>Loading more…</p>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {archiving && (
        <ConfirmDialog
          title="Archive product"
          message={`Archive "${archiving.name}"? It will no longer be visible in your shop.`}
          confirmLabel="Archive"
          danger
          onConfirm={() => handleArchive(archiving)}
          onCancel={() => setArchiving(null)}
        />
      )}
    </div>
  );
}
