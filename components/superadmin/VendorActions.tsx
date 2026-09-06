"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiBrowser, ApiError } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Ban, CheckCircle2, RotateCcw, ShieldOff } from "lucide-react";

interface VendorActionsProps {
  vendorId: string;
  suspended: boolean;
  verified: boolean;
}

export default function VendorActions({ vendorId, suspended, verified }: VendorActionsProps) {
  const router = useRouter();
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<"unsuspend" | "verify" | "unverify" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await apiBrowser(`/superadmin/vendors/${vendorId}`, { method: "PATCH", body });
      setSuspending(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(248,113,113,0.12)", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {suspending ? (
        <div className="flex flex-col gap-3">
          <Textarea
            label="Why are you suspending this vendor?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Repeated reports of orders taken and never fulfilled."
            hint="Shown to the vendor in their own dashboard. Shoppers only see a neutral 'unavailable' page."
          />
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" loading={busy} disabled={!reason.trim()} onClick={() => act({ action: "suspend", reason: reason.trim() })}>
              Confirm suspension
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSuspending(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {suspended ? (
            <Button variant="secondary" size="sm" loading={busy} onClick={() => setConfirming("unsuspend")}>
              <RotateCcw size={13} />
              Lift suspension
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setSuspending(true)}>
              <Ban size={13} />
              Suspend
            </Button>
          )}

          {verified ? (
            <Button variant="secondary" size="sm" loading={busy} onClick={() => setConfirming("unverify")}>
              <ShieldOff size={13} />
              Remove verification
            </Button>
          ) : (
            <Button variant="secondary" size="sm" loading={busy} onClick={() => setConfirming("verify")}>
              <CheckCircle2 size={13} />
              Verify owner directly
            </Button>
          )}
        </div>
      )}

      {confirming === "unsuspend" && (
        <ConfirmDialog
          title="Lift suspension"
          message="This vendor's storefront becomes reachable again immediately."
          confirmLabel="Lift suspension"
          onConfirm={() => act({ action: "unsuspend" })}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "verify" && (
        <ConfirmDialog
          title="Verify this owner"
          message="This marks the owner verified and shows a Verified badge on every shop they own — not just this one. Only do this if you have checked their ID."
          confirmLabel="Verify"
          onConfirm={() => act({ action: "verify" })}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirming === "unverify" && (
        <ConfirmDialog
          title="Remove verification"
          message="The Verified badge is removed from every shop this owner runs, and the scam warning returns to their payment pages."
          confirmLabel="Remove verification"
          danger
          onConfirm={() => act({ action: "unverify" })}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
