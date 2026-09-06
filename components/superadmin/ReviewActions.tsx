"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiBrowser, ApiError } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Check, X } from "lucide-react";

export default function ReviewActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (body: Record<string, unknown>, kind: "approve" | "reject") => {
    setBusy(kind);
    setError(null);
    try {
      await apiBrowser(`/superadmin/verifications/${applicationId}`, { method: "PATCH", body });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(248,113,113,0.12)", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {rejecting ? (
        <div className="flex flex-col gap-3">
          <Textarea
            label="Why are you rejecting this?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. The photo of the card is too blurry to read the number."
            hint="The vendor sees this word for word, and can fix it and resubmit."
          />
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={busy === "reject"}
              disabled={!reason.trim()}
              onClick={() => submit({ action: "reject", reason: reason.trim() }, "reject")}
            >
              Confirm rejection
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setRejecting(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button loading={busy === "approve"} onClick={() => submit({ action: "approve" }, "approve")}>
            <Check size={14} />
            Approve
          </Button>
          <Button variant="secondary" onClick={() => setRejecting(true)}>
            <X size={14} />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
