"use client";

import { useState } from "react";
import type { PaymentMethod, PaymentMethodType } from "@/types";
import { apiBrowser, ApiError } from "@/lib/api-client";
import Topbar from "@/components/dashboard/Topbar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { CreditCard, Smartphone, Banknote, Plus, Archive, X } from "lucide-react";

// Lifted out of the Settings tab strip and given its own dashboard route.
// Being paid is a standing job a vendor comes back to, not a setting they
// configure once — burying it behind Settings > Payment made it read like
// the latter.

function PaymentMethodIcon({ type }: { type: string }) {
  if (type === "momo") return <Smartphone size={16} style={{ color: "#F59E0B" }} />;
  if (type === "bank") return <CreditCard size={16} style={{ color: "#2563EB" }} />;
  return <Banknote size={16} style={{ color: "var(--green)" }} />;
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
      const { paymentMethod: saved } = await apiBrowser<{ paymentMethod: PaymentMethod }>(
        method ? `/payment-methods/${method.id}` : "/payment-methods",
        { method: method ? "PATCH" : "POST", body },
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

interface PaymentsClientProps {
  initialPaymentMethods: PaymentMethod[];
}

export default function PaymentsClient({ initialPaymentMethods }: PaymentsClientProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
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
    setError(null);
    try {
      await apiBrowser(`/payment-methods/${pm.id}`, { method: "DELETE" });
      setMethods((prev) => prev.map((m) => (m.id === pm.id ? { ...m, active: false } : m)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Couldn't remove "${pm.label}". Please try again.`);
    } finally {
      setArchivingId(null);
      setArchiving(null);
    }
  };

  return (
    <>
      <Topbar
        title="Get paid"
        subtitle={
          activeMethods.length === 0
            ? "No payment methods yet"
            : `${activeMethods.length} payment ${activeMethods.length === 1 ? "method" : "methods"} shown to customers`
        }
        actions={
          activeMethods.length > 0 ? (
            <Button size="sm" onClick={() => { setEditingMethod(undefined); setShowModal(true); }}>
              <Plus size={13} />
              Add method
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-xl flex flex-col gap-8">
        {error && (
          <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        <div>
          <p className="text-sm mb-4" style={{ color: "var(--tx2)" }}>
            How customers pay you. These appear on your storefront&apos;s payment page and on every
            booking or order that asks for a deposit. Booktns never handles the money — customers
            pay you directly.
          </p>
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
            <div
              className="flex flex-col items-center gap-2 py-10 px-6 rounded-[var(--rl)] text-center"
              style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                style={{ background: "var(--bg3)", color: "var(--tx3)" }}
              >
                <Smartphone size={17} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                No way to pay you yet
              </p>
              <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
                Add a MoMo number, a bank account, or cash on arrival. Until you do, your payment
                page tells customers to message you to arrange it.
              </p>
            </div>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setEditingMethod(undefined); setShowModal(true); }}>
          <Plus size={13} />
          {activeMethods.length === 0 ? "Add your first payment method" : "Add payment method"}
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
    </>
  );
}
