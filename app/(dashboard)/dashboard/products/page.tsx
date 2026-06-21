"use client";

import { useState } from "react";
import { products as initialProducts, formatPrice } from "@/lib/data";
import type { Product } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Plus, X, AlertTriangle, Package } from "lucide-react";

function getStockBadge(p: Product) {
  if (p.stockCount === 0) return <Badge variant="out">Out of stock</Badge>;
  if (p.stockCount <= p.lowStockThreshold) return <Badge variant="low">Low stock</Badge>;
  return <Badge variant="active">{p.stockCount} in stock</Badge>;
}

interface AddProductModalProps {
  onClose: () => void;
  onAdd: (p: Product) => void;
}

function AddProductModal({ onClose, onAdd }: AddProductModalProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !price) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onAdd({
      id: `p${Date.now()}`,
      vendorId: "v1",
      name: name.trim(),
      priceInPesewas: Math.round(parseFloat(price) * 100),
      stockCount: parseInt(stock) || 0,
      lowStockThreshold: 5,
      description: description.trim() || undefined,
      active: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-[var(--rl)] overflow-hidden" style={{ background: "var(--bg)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="font-display font-medium text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
            Add Product
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg3)]" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <Input label="Product name" placeholder="e.g. Argan Hair Oil" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (GH₵)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            <Input label="Stock count" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
          </div>
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
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleSubmit} className="flex-1" disabled={!name.trim() || !price}>
            Add Product
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [productList, setProductList] = useState<Product[]>(initialProducts);
  const [showAddModal, setShowAddModal] = useState(false);

  const lowStockProducts = productList.filter((p) => p.stockCount > 0 && p.stockCount <= p.lowStockThreshold);

  return (
    <div>
      <Topbar
        title="Products"
        subtitle={`${productList.filter((p) => p.active).length} products`}
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
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
        {productList.map((product) => (
          <div
            key={product.id}
            className="rounded-[var(--rl)] overflow-hidden"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            {/* Image placeholder */}
            <div
              className="w-full aspect-[4/3] flex items-center justify-center"
              style={{ background: "var(--bg3)" }}
            >
              <Package size={32} style={{ color: "var(--tx3)" }} />
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
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button
          onClick={() => setShowAddModal(true)}
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

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdd={(p) => setProductList((prev) => [...prev, p])}
        />
      )}
    </div>
  );
}
