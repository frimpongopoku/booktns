"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/data";
import type { Product, Media } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MediaPickerModal from "@/components/dashboard/MediaPickerModal";
import { Plus, X, AlertTriangle, Package, Archive, ImagePlus } from "lucide-react";

function getStockBadge(p: Product) {
  if (p.stockCount === 0) return <Badge variant="out">Out of stock</Badge>;
  if (p.stockCount <= p.lowStockThreshold) return <Badge variant="low">Low stock</Badge>;
  return <Badge variant="active">{p.stockCount} in stock</Badge>;
}

interface ApiErrorBody {
  error: string;
  code: string;
}

interface ProductModalProps {
  product?: Product;
  media: Media[];
  onClose: () => void;
  onSaved: (p: Product) => void;
  onMediaUploaded: (item: Media) => void;
}

function ProductModal({ product, media, onClose, onSaved, onMediaUploaded }: ProductModalProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(String((product?.priceInPesewas ?? 0) / 100));
  const [stock, setStock] = useState(String(product?.stockCount ?? ""));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product?.lowStockThreshold ?? 5));
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl);
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
      imageUrl: imageUrl ?? null,
    };

    try {
      const res = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const { product: saved } = (await res.json()) as { product: Product };
      onSaved(saved);
      close();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
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
        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
              {error}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Photo</label>
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-[var(--r)] overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={20} style={{ color: "var(--tx3)" }} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowPicker(true)}>
                  <ImagePlus size={13} />
                  {imageUrl ? "Change photo" : "Choose photo"}
                </Button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(undefined)}
                    className="text-xs text-left"
                    style={{ color: "var(--tx3)" }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
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
          media={media}
          onClose={() => setShowPicker(false)}
          onSelect={(url) => setImageUrl(url)}
          onUploaded={onMediaUploaded}
        />
      )}
    </div>
  );
}

interface ProductsClientProps {
  initialProducts: Product[];
  initialMedia: Media[];
}

export default function ProductsClient({ initialProducts, initialMedia }: ProductsClientProps) {
  const [productList, setProductList] = useState<Product[]>(initialProducts);
  const [mediaList, setMediaList] = useState<Media[]>(initialMedia);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const activeProducts = productList.filter((p) => p.active);
  const lowStockProducts = activeProducts.filter((p) => p.stockCount > 0 && p.stockCount <= p.lowStockThreshold);

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
    if (!confirm(`Archive "${product.name}"? It will no longer be visible in your shop.`)) return;
    setArchivingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (res.ok) {
        setProductList((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: false } : p)));
      }
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div>
      <Topbar
        title="Products"
        subtitle={`${activeProducts.length} products`}
        actions={
          <Button size="sm" onClick={() => { setEditingProduct(undefined); setShowModal(true); }}>
            <Plus size={14} />
            Add Product
          </Button>
        }
      />

      {/* Low stock warning */}
      {lowStockProducts.length > 0 && (
        <div
          className="flex items-center gap-3 p-3 rounded-[var(--r)] mb-5"
          style={{ background: "var(--amber-bg)" }}
        >
          <AlertTriangle size={16} style={{ color: "var(--amber)" }} />
          <p className="text-sm" style={{ color: "var(--amber)" }}>
            <span className="font-semibold">{lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""}</span> {lowStockProducts.length > 1 ? "are" : "is"} running low:{" "}
            {lowStockProducts.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeProducts.map((product) => (
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
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditingProduct(product); setShowModal(true); }}
                  >
                    Edit
                  </Button>
                  <button
                    onClick={() => handleArchive(product)}
                    disabled={archivingId === product.id}
                    className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
                    style={{ color: "var(--tx3)" }}
                    aria-label={`Archive ${product.name}`}
                  >
                    <Archive size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add new card */}
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
      </div>

      {showModal && (
        <ProductModal
          product={editingProduct}
          media={mediaList}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
          onMediaUploaded={(item) => setMediaList((prev) => [item, ...prev])}
        />
      )}
    </div>
  );
}
