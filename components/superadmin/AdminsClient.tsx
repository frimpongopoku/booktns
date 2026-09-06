"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiBrowser, ApiError } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus, Trash2, ShieldCheck } from "lucide-react";

export interface AdminRow {
  id: string;
  email: string;
  name: string | null;
  invitedAt: string;
  acceptedAt: string | null;
}

interface AdminsClientProps {
  admins: AdminRow[];
  currentAdminId: string;
}

export default function AdminsClient({ admins, currentAdminId }: AdminsClientProps) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<AdminRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiBrowser("/superadmin/admins", {
        method: "POST",
        body: { email: email.trim(), name: name.trim() || undefined },
      });
      setEmail("");
      setName("");
      setInviting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (admin: AdminRow) => {
    setError(null);
    try {
      await apiBrowser(`/superadmin/admins/${admin.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(248,113,113,0.12)", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex items-center gap-3 p-3.5 rounded-[var(--rl)]"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <ShieldCheck size={15} className="flex-shrink-0" style={{ color: admin.acceptedAt ? "var(--green)" : "var(--tx3)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>
                {admin.name || admin.email}
                {admin.id === currentAdminId && (
                  <span className="ml-2 text-[10px] font-normal" style={{ color: "var(--tx3)" }}>you</span>
                )}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                {admin.name ? `${admin.email} · ` : ""}
                {admin.acceptedAt ? "Active" : "Invited, not signed in yet"}
              </p>
            </div>
            {admin.id !== currentAdminId && (
              <button
                onClick={() => setRemoving(admin)}
                className="p-1.5 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)]"
                style={{ color: "var(--tx3)" }}
                aria-label={`Remove ${admin.email}`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {inviting ? (
        <div
          className="flex flex-col gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <Input
            label="Google account email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="them@example.com"
            hint="Must be the exact Google account they'll sign in with."
          />
          <Input label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center gap-2">
            <Button size="sm" loading={busy} disabled={!email.trim()} onClick={handleInvite}>
              Grant access
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setInviting(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => setInviting(true)}>
          <Plus size={13} />
          Add administrator
        </Button>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove administrator"
          message={`${removing.email} loses access to the platform console immediately. They can be added again later.`}
          confirmLabel="Remove"
          danger
          onConfirm={() => handleRemove(removing)}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
