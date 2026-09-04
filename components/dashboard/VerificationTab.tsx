"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { BadgeCheck, ShieldAlert, Clock, AlertTriangle, Upload, X } from "lucide-react";
import type { VerificationStatus } from "@/types";
import { apiBrowser, ApiError } from "@/lib/api-client";

export interface VerificationApplication {
  legalName: string;
  ghanaCardNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  submittedAt: string;
}

interface VerificationTabProps {
  status: VerificationStatus;
  application: VerificationApplication | null;
}

// Stages a local preview and uploads only on an explicit submit — never on
// file selection. Revokes the object URL when the choice is cleared or the
// component unmounts, so previews don't leak.
function PhotoPicker({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
        {label}
      </label>
      {previewUrl ? (
        <div className="relative w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="w-full rounded-[var(--r)]" style={{ border: "1px solid var(--bds)" }} />
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
            aria-label={`Remove ${label}`}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-6 rounded-[var(--r)] w-full max-w-xs justify-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)", color: "var(--tx3)" }}
        >
          <Upload size={15} />
          <span className="text-sm">Choose a photo</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <p className="text-xs" style={{ color: "var(--tx3)" }}>{hint}</p>
    </div>
  );
}

export default function VerificationTab({ status, application }: VerificationTabProps) {
  const router = useRouter();
  const [legalName, setLegalName] = useState(application?.legalName ?? "");
  const [cardNumber, setCardNumber] = useState(application?.ghanaCardNumber ?? "");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!legalName.trim() || !cardNumber.trim() || !idPhoto) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append("legalName", legalName.trim());
    form.append("ghanaCardNumber", cardNumber.trim());
    form.append("idPhoto", idPhoto);
    if (selfie) form.append("selfiePhoto", selfie);

    try {
      // FormData passes through apiBrowser untouched — see lib/api-client.ts.
      await apiBrowser("/verification", { method: "POST", body: form });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "VERIFIED") {
    return (
      <div className="max-w-xl">
        <div
          className="flex items-start gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--green-bg)", border: "1px solid var(--green)" }}
        >
          <BadgeCheck size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--green)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>You&apos;re verified</p>
            <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>
              A Verified badge shows on your storefront and on your payment page, where it replaces the
              caution notice customers otherwise see before paying. This covers every shop you own.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="max-w-xl">
        <div
          className="flex items-start gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--amber-bg)", border: "1px solid var(--amber)" }}
        >
          <Clock size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--amber)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--amber)" }}>Under review</p>
            <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>
              We&apos;re checking the documents you submitted
              {application ? ` on ${new Date(application.submittedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}.
              We&apos;ll email you when it&apos;s done. You can&apos;t change your submission while it&apos;s being reviewed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ac-bg)" }}
        >
          <ShieldAlert size={16} style={{ color: "var(--ac)" }} />
        </div>
        <p className="text-sm" style={{ color: "var(--tx2)" }}>
          Customers are sending money directly to you, often before they&apos;ve met you. Verifying your
          identity puts a Verified badge on your storefront and replaces the caution notice on your
          payment page with a green panel. Your ID is seen only by the Booktns team and is never shown
          to customers.
        </p>
      </div>

      {status === "REJECTED" && application?.rejectionReason && (
        <div
          className="flex items-start gap-2.5 p-3.5 rounded-[var(--rl)]"
          style={{ background: "rgba(185,28,28,0.08)", border: "1px solid rgba(185,28,28,0.35)" }}
        >
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#B91C1C" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#B91C1C" }}>
              We couldn&apos;t verify your last submission
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>{application.rejectionReason}</p>
            <p className="text-xs mt-2" style={{ color: "var(--tx3)" }}>
              Fix that and submit again below — there&apos;s no limit on attempts.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      <Input
        label="Full name, as it appears on your ID"
        value={legalName}
        onChange={(e) => setLegalName(e.target.value)}
        placeholder="e.g. Ama Serwaa Frimpong"
      />
      <Input
        label="Ghana Card number"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
        placeholder="GHA-000000000-0"
        hint="The long number on the front of your card."
      />

      <PhotoPicker
        label="Photo of your Ghana Card"
        hint="The front of the card. Make sure the number and your name are readable."
        file={idPhoto}
        onChange={setIdPhoto}
      />
      <PhotoPicker
        label="Selfie holding your card (optional)"
        hint="Speeds up review, but isn't required."
        file={selfie}
        onChange={setSelfie}
      />

      <Button
        className="w-fit"
        loading={submitting}
        disabled={!legalName.trim() || !cardNumber.trim() || !idPhoto}
        onClick={handleSubmit}
      >
        Submit for verification
      </Button>
    </div>
  );
}
