import { CopyButton } from "@/components/ui/CopyButton";
import { ExternalLink, MessageCircle } from "lucide-react";

interface ShareRowProps {
  label: string;
  sublabel?: string;
  url: string;
  vendorName: string;
}

// One shareable link: the URL itself, copy, open, and a WhatsApp hand-off —
// WhatsApp being how a Ghanaian salon actually sends a customer a link.
// Shared between Settings > Booking link and the Payments page, which both
// need to hand a customer-facing URL to a vendor the same way.
export function ShareRow({ label, sublabel, url, vendorName }: ShareRowProps) {
  const whatsappText = encodeURIComponent(`${label} — ${vendorName}: ${url}`);

  return (
    <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>{label}</p>
          {sublabel && <p className="text-xs" style={{ color: "var(--tx3)" }}>{sublabel}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share ${label} on WhatsApp`}
            className="flex items-center justify-center w-7 h-7 rounded-[6px]"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}
          >
            <MessageCircle size={13} />
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${label}`}
            className="flex items-center justify-center w-7 h-7 rounded-[6px]"
            style={{ background: "var(--bg3)", color: "var(--tx2)" }}
          >
            <ExternalLink size={13} />
          </a>
          <CopyButton text={url} />
        </div>
      </div>
      <p className="text-xs font-mono truncate" style={{ color: "var(--tx3)" }}>{url}</p>
    </div>
  );
}
