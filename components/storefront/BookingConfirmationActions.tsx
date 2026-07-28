"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CalendarPlus, Download, Pencil, XCircle } from "lucide-react";
import type { BookingStatus } from "@/types";

interface ApiErrorBody {
  error: string;
  code: string;
}

interface BookingConfirmationActionsProps {
  slug: string;
  status: BookingStatus;
  vendorName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  calendarUrl: string;
  confirmedPdfUrl?: string;
}

// Self-service surface for the guest who owns this booking — possessing the
// unguessable slug is their only "login". Editing and cancelling are both
// locked the moment the vendor confirms; from then on they're directed to
// contact the vendor directly, same boundary the vendor-side dashboard uses.
export default function BookingConfirmationActions({
  slug,
  status,
  vendorName,
  customerName,
  customerPhone,
  customerEmail,
  calendarUrl,
  confirmedPdfUrl,
}: BookingConfirmationActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [email, setEmail] = useState(customerEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "pending";
  const isLockedByVendor = status === "confirmed" || status === "completed" || status === "rescheduled";

  const patchBooking = async (body: Record<string, string>) => {
    const res = await fetch(`/api/bookings/by-slug/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new Error(errBody?.error ?? "Something went wrong. Please try again.");
    }
    return res.json();
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    setError(null);
    try {
      await patchBooking({ customerName: name.trim(), customerPhone: phone.trim(), customerEmail: email.trim() });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      await patchBooking({ status: "cancelled" });
      setConfirmingCancel(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setConfirmingCancel(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {isLockedByVendor && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium"
          style={{ background: "var(--bg2)", color: "var(--tx2)" }}
        >
          <CalendarPlus size={15} />
          Add to Calendar
        </a>
      )}

      {isLockedByVendor && confirmedPdfUrl && (
        <a
          href={confirmedPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium"
          style={{ background: "var(--bg2)", color: "var(--tx2)" }}
        >
          <Download size={15} />
          Download PDF
        </a>
      )}

      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {isPending && !editing && (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Edit details
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmingCancel(true)}>
            <XCircle size={14} />
            Cancel booking
          </Button>
        </div>
      )}

      {isPending && editing && (
        <div className="flex flex-col gap-3 p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="WhatsApp number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setEditing(false); setError(null); }}>
              Cancel
            </Button>
            <Button className="flex-1" loading={saving} onClick={handleSaveDetails}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      {isLockedByVendor && (
        <p className="text-xs text-center" style={{ color: "var(--tx3)" }}>
          To change or cancel this booking, contact {vendorName} directly.
        </p>
      )}

      {confirmingCancel && (
        <ConfirmDialog
          title="Cancel booking?"
          message="This will cancel your booking request. You'll need to start a new booking if you change your mind."
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          danger
          onConfirm={handleCancel}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}
    </div>
  );
}
