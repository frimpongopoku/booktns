"use client";

import { useState } from "react";
import type { BusinessHours, Vendor, StorefrontDisplayMode, PaymentMethod, PaymentMethodType } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import BusinessHoursCard from "@/components/dashboard/BusinessHoursCard";
import MediaPickerModal from "@/components/dashboard/MediaPickerModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { CreditCard, Smartphone, Banknote, Check, ImagePlus, ExternalLink, Rocket, X, Plus, Archive } from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

const DISPLAY_MODE_OPTIONS: { value: StorefrontDisplayMode; label: string; desc: string }[] = [
  { value: "All", label: "Show all", desc: "Every active service/product appears on your home page" },
  { value: "FeaturedOnly", label: "Featured only", desc: "Only items you've marked as featured appear" },
  { value: "AllWithFeaturedHighlighted", label: "Show all, highlight featured", desc: "Everything appears, but featured items are shown first with a badge" },
];

type SettingsTab = "storefront" | "payment" | "booking" | "whatsapp" | "billing";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "storefront", label: "Storefront" },
  { key: "payment", label: "Payment" },
  { key: "booking", label: "Booking" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "billing", label: "Billing" },
];

const BILLING_HISTORY = [
  { date: "Jun 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
  { date: "May 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
  { date: "Apr 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
];

function PaymentMethodIcon({ type }: { type: string }) {
  if (type === "momo") return <Smartphone size={16} style={{ color: "#F59E0B" }} />;
  if (type === "bank") return <CreditCard size={16} style={{ color: "#2563EB" }} />;
  return <Banknote size={16} style={{ color: "var(--green)" }} />;
}

interface StorefrontTabProps {
  vendor: Vendor;
  businessHours: BusinessHours[];
}

function StorefrontTab({ vendor, businessHours }: StorefrontTabProps) {
  const [name, setName] = useState(vendor.name);
  const [description, setDescription] = useState(vendor.description);
  const [location, setLocation] = useState(vendor.location);
  const [phone, setPhone] = useState(vendor.phone);
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(vendor.coverImageUrl);
  const [displayMode, setDisplayMode] = useState<StorefrontDisplayMode>(vendor.storefrontDisplayMode);
  const [published, setPublished] = useState(vendor.storefrontPublished);
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchVendor = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/vendor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new Error(errBody?.error ?? "Something went wrong. Please try again.");
    }
    return (await res.json()) as { vendor: Vendor };
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await patchVendor({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        phone: phone.trim(),
        logoUrl: logoUrl ?? null,
        coverImageUrl: coverImageUrl ?? null,
        storefrontDisplayMode: displayMode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const { vendor: updated } = await patchVendor({ storefrontPublished: !published });
      setPublished(updated.storefrontPublished);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {/* Publish */}
      <div className="p-4 rounded-[var(--rl)] flex items-center justify-between gap-4" style={{ background: published ? "var(--green-bg)" : "var(--bg2)", border: `1px solid ${published ? "var(--green)" : "var(--bds)"}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: published ? "var(--green)" : "var(--bg3)", color: published ? "white" : "var(--tx3)" }}>
            <Rocket size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
              {published ? "Your storefront is live" : "Your storefront isn't published yet"}
            </p>
            {published ? (
              <a href={`/${vendor.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1" style={{ color: "var(--ac)" }}>
                booktns.com/{vendor.slug} <ExternalLink size={11} />
              </a>
            ) : (
              <p className="text-xs" style={{ color: "var(--tx3)" }}>Preview it from the dashboard, then publish when you&apos;re ready</p>
            )}
          </div>
        </div>
        <Button variant={published ? "secondary" : "primary"} size="sm" loading={publishing} onClick={handleTogglePublish} className="flex-shrink-0">
          {published ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Logo</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={18} style={{ color: "var(--tx3)" }} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowLogoPicker(true)} className="w-fit">
                {logoUrl ? "Change logo" : "Choose logo"}
              </Button>
              {logoUrl && (
                <button type="button" onClick={() => setLogoUrl(undefined)} className="text-xs text-left" style={{ color: "var(--tx3)" }}>
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Cover image</label>
          <div className="w-full aspect-[3/1] rounded-[var(--r)] overflow-hidden flex items-center justify-center" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus size={20} style={{ color: "var(--tx3)" }} />
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowCoverPicker(true)} className="w-fit">
              {coverImageUrl ? "Change cover image" : "Choose cover image"}
            </Button>
            {coverImageUrl && (
              <button type="button" onClick={() => setCoverImageUrl(undefined)} className="text-xs" style={{ color: "var(--tx3)" }}>
                Remove
              </button>
            )}
          </div>
        </div>

        <Input label="Business name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Storefront URL slug"
          value={vendor.slug}
          disabled
          hint={`booktns.com/${vendor.slug} — contact support to change this`}
        />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input label="Contact phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Home page display</label>
          <div className="flex flex-col gap-2">
            {DISPLAY_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDisplayMode(opt.value)}
                className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left"
                style={{
                  background: displayMode === opt.value ? "var(--ac-bg)" : "var(--bg2)",
                  border: `1px solid ${displayMode === opt.value ? "var(--ac)" : "var(--bds)"}`,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: displayMode === opt.value ? "var(--ac)" : "var(--bd)",
                    background: displayMode === opt.value ? "var(--ac)" : "transparent",
                  }}
                >
                  {displayMode === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{opt.label}</p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button loading={saving} onClick={handleSave} className="w-fit">
          {saved ? <><Check size={14} /> Saved</> : "Save Changes"}
        </Button>
      </div>

      <div className="pt-6" style={{ borderTop: "1px solid var(--bd)" }}>
        <BusinessHoursCard initialHours={businessHours} />
      </div>

      {showLogoPicker && (
        <MediaPickerModal
          selectedUrls={logoUrl ? [logoUrl] : []}
          maxSelectable={1}
          onClose={() => setShowLogoPicker(false)}
          onConfirm={(urls) => setLogoUrl(urls[0])}
        />
      )}
      {showCoverPicker && (
        <MediaPickerModal
          selectedUrls={coverImageUrl ? [coverImageUrl] : []}
          maxSelectable={1}
          onClose={() => setShowCoverPicker(false)}
          onConfirm={(urls) => setCoverImageUrl(urls[0])}
        />
      )}
    </div>
  );
}

interface PaymentMethodModalProps {
  method?: PaymentMethod;
  onClose: () => void;
  onSaved: (pm: PaymentMethod) => void;
}

function PaymentMethodModal({ method, onClose, onSaved }: PaymentMethodModalProps) {
  const [type, setType] = useState<PaymentMethodType>(method?.type ?? "momo");
  const [label, setLabel] = useState(method?.label ?? "");
  const [accountName, setAccountName] = useState(method?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(method?.accountNumber ?? "");
  const [bankName, setBankName] = useState(method?.bankName ?? "");
  const [network, setNetwork] = useState(method?.network ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const handleSave = async () => {
    if (!label.trim() || !accountName.trim()) return;
    setLoading(true);
    setError(null);

    const body = {
      type,
      label: label.trim(),
      accountName: accountName.trim(),
      accountNumber: type === "cash" ? undefined : accountNumber.trim(),
      bankName: type === "bank" ? bankName.trim() : undefined,
      network: type === "momo" ? network.trim() : undefined,
    };

    try {
      const res = await fetch(method ? `/api/payment-methods/${method.id}` : "/api/payment-methods", {
        method: method ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const { paymentMethod: saved } = (await res.json()) as { paymentMethod: PaymentMethod };
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
            {method ? "Edit Payment Method" : "Add Payment Method"}
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
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentMethodType)}
              className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
            >
              <option value="momo">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash on Arrival</option>
            </select>
          </div>
          <Input label="Label" placeholder="e.g. MTN MoMo" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input label="Account name" placeholder="Full name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          {type !== "cash" && (
            <Input
              label={type === "momo" ? "MoMo number" : "Account number"}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          )}
          {type === "bank" && (
            <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          )}
          {type === "momo" && (
            <Input label="Network" placeholder="e.g. MTN" value={network} onChange={(e) => setNetwork(e.target.value)} />
          )}
        </div>
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleSave} className="flex-1" disabled={!label.trim() || !accountName.trim()}>
            {method ? "Save Changes" : "Add Method"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PaymentTabProps {
  vendor: Vendor;
  initialPaymentMethods: PaymentMethod[];
}

function PaymentTab({ vendor, initialPaymentMethods }: PaymentTabProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
  const [personalWhatsapp, setPersonalWhatsapp] = useState(vendor.personalWhatsappNumber ?? "");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savedWhatsapp, setSavedWhatsapp] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | undefined>();
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeMethods = methods.filter((m) => m.active);

  const handleSaved = (pm: PaymentMethod) => {
    setMethods((prev) => {
      const idx = prev.findIndex((x) => x.id === pm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pm;
        return next;
      }
      return [...prev, pm];
    });
  };

  const handleArchive = async (pm: PaymentMethod) => {
    setArchivingId(pm.id);
    try {
      const res = await fetch(`/api/payment-methods/${pm.id}`, { method: "DELETE" });
      if (res.ok) {
        setMethods((prev) => prev.map((m) => (m.id === pm.id ? { ...m, active: false } : m)));
      }
    } finally {
      setArchivingId(null);
      setArchiving(null);
    }
  };

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalWhatsappNumber: personalWhatsapp.trim() || null }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(errBody?.error ?? "Something went wrong. Please try again.");
      }
      setSavedWhatsapp(true);
      setTimeout(() => setSavedWhatsapp(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSavingWhatsapp(false);
    }
  };

  return (
    <div className="max-w-xl flex flex-col gap-8">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Input
          label="Personal WhatsApp number"
          type="tel"
          placeholder="+234 800 000 0000"
          value={personalWhatsapp}
          onChange={(e) => setPersonalWhatsapp(e.target.value)}
          hint="Where customer booking/order deep links are sent — separate from any bot number"
        />
        <Button size="sm" loading={savingWhatsapp} onClick={handleSaveWhatsapp} className="w-fit">
          {savedWhatsapp ? <><Check size={14} /> Saved</> : "Save"}
        </Button>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>Payment methods</p>
        <div className="flex flex-col gap-3 mb-4">
          {activeMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <div
                className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--bg3)" }}
              >
                <PaymentMethodIcon type={pm.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{pm.label}</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {pm.accountName}
                  {pm.accountNumber && ` · ${pm.accountNumber}`}
                  {pm.bankName && ` · ${pm.bankName}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setEditingMethod(pm); setShowModal(true); }}>Edit</Button>
              <button
                onClick={() => setArchiving(pm)}
                disabled={archivingId === pm.id}
                className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
                style={{ color: "var(--tx3)" }}
                aria-label={`Remove ${pm.label}`}
              >
                <Archive size={14} />
              </button>
            </div>
          ))}
          {activeMethods.length === 0 && (
            <p className="text-sm py-4 text-center" style={{ color: "var(--tx3)" }}>No payment methods yet</p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setEditingMethod(undefined); setShowModal(true); }}>
          <Plus size={13} />
          Add payment method
        </Button>
      </div>

      {showModal && (
        <PaymentMethodModal
          method={editingMethod}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {archiving && (
        <ConfirmDialog
          title="Remove payment method"
          message={`Remove "${archiving.label}"? Customers will no longer see it as a payment option.`}
          confirmLabel="Remove"
          danger
          onConfirm={() => handleArchive(archiving)}
          onCancel={() => setArchiving(null)}
        />
      )}
    </div>
  );
}

interface BookingTabProps {
  vendor: Vendor;
}

function BookingTab({ vendor }: BookingTabProps) {
  const [depositType, setDepositType] = useState(vendor.depositSetting);
  const [depositAmount, setDepositAmount] = useState(
    vendor.depositSetting === "Fixed" ? String((vendor.depositValue ?? 0) / 100) : String(vendor.depositValue ?? 50)
  );
  const [policy, setPolicy] = useState(vendor.cancellationPolicy ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const depositValue =
      depositType === "None" ? null : depositType === "Fixed" ? Math.round(parseFloat(depositAmount) * 100) || 0 : parseInt(depositAmount) || 0;

    try {
      const res = await fetch("/api/vendor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositSetting: depositType,
          depositValue,
          cancellationPolicy: policy.trim() || null,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        throw new Error(errBody?.error ?? "Something went wrong. Please try again.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>Deposit requirement</p>
        <div className="flex flex-col gap-2">
          {(["None", "Fixed", "Percentage"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setDepositType(type)}
              className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left"
              style={{
                background: depositType === type ? "var(--ac-bg)" : "var(--bg2)",
                border: `1px solid ${depositType === type ? "var(--ac)" : "var(--bds)"}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: depositType === type ? "var(--ac)" : "var(--bd)",
                  background: depositType === type ? "var(--ac)" : "transparent",
                }}
              >
                {depositType === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                  {type === "None" ? "No deposit" : type === "Fixed" ? "Fixed amount" : "Percentage"}
                </p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {type === "None"
                    ? "Customers pay in full on arrival"
                    : type === "Fixed"
                    ? "Require a fixed deposit per booking"
                    : "Require a % of the booking total"}
                </p>
              </div>
            </button>
          ))}
        </div>
        {depositType !== "None" && (
          <div className="mt-3">
            <Input
              label={depositType === "Fixed" ? "Deposit amount (GH₵)" : "Deposit percentage (%)"}
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
        )}
      </div>
      <Textarea
        label="Cancellation policy"
        value={policy}
        onChange={(e) => setPolicy(e.target.value)}
        rows={4}
      />
      <Button loading={loading} onClick={handleSave} className="w-fit">
        {saved ? <><Check size={14} /> Saved</> : "Save Booking Settings"}
      </Button>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="max-w-xl">
      <p className="text-sm mb-4" style={{ color: "var(--tx2)" }}>
        Connected WhatsApp numbers receive booking notifications and can manage bookings via the bot.
      </p>
      <div className="flex flex-col gap-3 mb-6">
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--ac)" }}
          >
            R
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Rose Adeyemi</p>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>+2348012345678 · Owner</p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
            title="Connected"
          />
        </div>
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--green)" }}
          >
            F
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Fatima Bello</p>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>+2348023456789 · Management</p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
            title="Connected"
          />
        </div>
      </div>
      <Button variant="secondary" size="sm">+ Add WhatsApp number</Button>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-xl">
      {/* Current plan */}
      <div
        className="p-5 rounded-[var(--rl)] mb-6"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--tx3)" }}>
              Current Plan
            </p>
            <p
              className="font-display text-2xl font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              Starter
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}
          >
            Active
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--tx2)" }}>
          <span>GH₵ 99 / month</span>
          <span>·</span>
          <span>Next billing: <span style={{ color: "var(--tx)" }}>Aug 1, 2025</span></span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm">Upgrade Plan</Button>
          <Button variant="ghost" size="sm">Manage Billing</Button>
        </div>
      </div>

      {/* Billing history */}
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>Billing History</p>
      <div
        className="rounded-[var(--rl)] overflow-hidden"
        style={{ border: "1px solid var(--bds)" }}
      >
        <div
          className="grid grid-cols-4 gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{ background: "var(--bg2)", color: "var(--tx3)" }}
        >
          <span>Date</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        <div className="flex flex-col gap-0.5 p-2" style={{ background: "var(--bg)" }}>
          {BILLING_HISTORY.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-3 py-3 rounded-lg hover:bg-[var(--bg2)] transition-colors items-center">
              <span className="text-sm" style={{ color: "var(--tx2)" }}>{row.date}</span>
              <span className="text-sm" style={{ color: "var(--tx)" }}>{row.plan}</span>
              <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{row.amount}</span>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full w-fit"
                style={{ background: "var(--green-bg)", color: "var(--green)" }}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SettingsClientProps {
  vendor: Vendor;
  businessHours: BusinessHours[];
  initialPaymentMethods: PaymentMethod[];
}

export default function SettingsClient({ vendor, businessHours, initialPaymentMethods }: SettingsClientProps) {
  const [tab, setTab] = useState<SettingsTab>("storefront");

  return (
    <div>
      <Topbar title="Settings" />

      {/* Tab nav */}
      <div
        className="flex overflow-x-auto gap-1 p-1 rounded-[var(--r)] mb-6 w-fit max-w-full"
        style={{ background: "var(--bg2)" }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-[var(--r)] text-sm font-medium transition-all whitespace-nowrap"
            style={
              tab === t.key
                ? { background: "var(--bg)", color: "var(--tx)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "var(--tx3)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "storefront" && <StorefrontTab vendor={vendor} businessHours={businessHours} />}
      {tab === "payment" && <PaymentTab vendor={vendor} initialPaymentMethods={initialPaymentMethods} />}
      {tab === "booking" && <BookingTab vendor={vendor} />}
      {tab === "whatsapp" && <WhatsAppTab />}
      {tab === "billing" && <BillingTab />}
    </div>
  );
}
