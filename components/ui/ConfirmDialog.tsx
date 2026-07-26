"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

// Shared confirmation modal — replaces native confirm() everywhere in the
// dashboard (archiving, deactivating, deleting, signing out) so destructive
// actions get a consistent, on-brand prompt instead of the browser's dialog.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onCancel, 210); };

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className={`w-full max-w-sm rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>{title}</h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed" style={{ color: "var(--tx2)" }}>{message}</p>
        </div>
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={close} className="flex-1">{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={handleConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
