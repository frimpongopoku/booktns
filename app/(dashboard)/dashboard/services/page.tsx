"use client";

import { useState } from "react";
import { services as initialServices, formatPrice, formatDuration } from "@/lib/data";
import type { Service, ServiceCategory } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Plus, X, Pencil, Scissors, Sparkles, Hand, Eye } from "lucide-react";

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  Hair: <Scissors size={14} />,
  Nails: <Hand size={14} />,
  Skin: <Sparkles size={14} />,
  Lashes: <Eye size={14} />,
  Brows: <Eye size={14} />,
  Other: <Sparkles size={14} />,
};

const CATEGORIES: ServiceCategory[] = ["Hair", "Nails", "Skin", "Lashes", "Brows", "Other"];

interface ServiceModalProps {
  service?: Service;
  onClose: () => void;
  onSave: (s: Service) => void;
}

function ServiceModal({ service, onClose, onSave }: ServiceModalProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? "Hair");
  const [duration, setDuration] = useState(String(service?.durationMinutes ?? 60));
  const [price, setPrice] = useState(String((service?.priceInPesewas ?? 0) / 100));
  const [description, setDescription] = useState(service?.description ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onSave({
      id: service?.id ?? `svc${Date.now()}`,
      vendorId: "v1",
      name: name.trim(),
      category,
      durationMinutes: parseInt(duration) || 60,
      priceInPesewas: Math.round(parseFloat(price) * 100) || 0,
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
            {service ? "Edit Service" : "Add Service"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg3)]" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <Input label="Service name" placeholder="e.g. Knotless Braids" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (minutes)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
            <Input label="Price (GH₵)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Description (optional)</label>
            <textarea
              className="px-3 py-2 rounded-[var(--r)] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief service description…"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
            />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleSave} className="flex-1" disabled={!name.trim()}>
            {service ? "Save Changes" : "Add Service"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [serviceList, setServiceList] = useState<Service[]>(initialServices);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [showModal, setShowModal] = useState(false);

  const grouped = CATEGORIES.reduce<Record<ServiceCategory, Service[]>>((acc, cat) => {
    acc[cat] = serviceList.filter((s) => s.category === cat && s.active);
    return acc;
  }, {} as Record<ServiceCategory, Service[]>);

  const handleSave = (s: Service) => {
    setServiceList((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = s;
        return next;
      }
      return [...prev, s];
    });
  };

  return (
    <div>
      <Topbar
        title="Services"
        subtitle={`${serviceList.filter((s) => s.active).length} active services`}
        actions={
          <Button size="sm" onClick={() => { setEditingService(undefined); setShowModal(true); }}>
            <Plus size={14} />
            Add Service
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        {CATEGORIES.map((cat) => {
          const catServices = grouped[cat];
          if (!catServices || catServices.length === 0) return null;
          const Icon = () => <>{CATEGORY_ICONS[cat]}</>;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ color: "var(--ac)" }}><Icon /></span>
                <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--tx2)" }}>
                  {cat}
                </h2>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--bds)", color: "var(--tx3)" }}
                >
                  {catServices.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {catServices.map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-[var(--r)]"
                    style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                    >
                      <Icon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{svc.name}</p>
                      <p className="text-xs" style={{ color: "var(--tx3)" }}>{formatDuration(svc.durationMinutes)}</p>
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--tx)" }}>
                      {formatPrice(svc.priceInPesewas)}
                    </p>
                    <Badge variant="active">Active</Badge>
                    <button
                      onClick={() => { setEditingService(svc); setShowModal(true); }}
                      className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors flex-shrink-0"
                      style={{ color: "var(--tx3)" }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <ServiceModal
          service={editingService}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
