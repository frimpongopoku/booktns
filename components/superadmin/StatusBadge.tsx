import type { VerificationStatus } from "@/lib/generated/prisma/enums";

// Green = verified, amber = pending, red = rejected. That mapping is fixed
// across the whole product — status page, this console, storefront badges —
// and is stated explicitly here rather than inherited, so it never drifts
// toward the console's violet chrome.
const STYLES: Record<VerificationStatus, { label: string; color: string; bg: string }> = {
  VERIFIED: { label: "Verified", color: "var(--green)", bg: "var(--green-bg)" },
  PENDING: { label: "Pending", color: "var(--amber)", bg: "var(--amber-bg)" },
  REJECTED: { label: "Rejected", color: "var(--red, #F87171)", bg: "var(--red-bg, rgba(248,113,113,0.10))" },
  NONE: { label: "Unverified", color: "var(--tx3)", bg: "var(--bg3)" },
};

export default function StatusBadge({ status }: { status: VerificationStatus }) {
  const style = STYLES[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}
