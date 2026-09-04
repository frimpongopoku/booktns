"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import type { FeedbackSource } from "@/lib/feedback";
import { apiBrowser, apiPublic, ApiError } from "@/lib/api-client";

interface FeedbackButtonProps {
  source: FeedbackSource;
  // The inbox to offer as a plain mailto alternative. Resolved server-side
  // (lib/feedback.ts, which falls back to the Biibisoft address) and passed
  // in, so the address never has to become a NEXT_PUBLIC_ var.
  supportEmail: string;
  // Whether the sender is already known to us. Signed-in staff are
  // identified server-side from their session, so the form doesn't ask an
  // owner for the address we already have.
  knownSender?: boolean;
  variant?: "sidebar" | "link";
  className?: string;
}

// One feedback control, three homes: the dashboard sidebar, the storefront
// footer, and the landing page footer. The submit path is the same for all
// three — POST /api/feedback, which emails SUPPORT_INBOX_EMAIL.
//
// A dialog rather than a mailto: link, because a mailto assumes a
// configured desktop mail client, which most people on a phone in Ghana
// simply don't have — the button would appear to do nothing.
export default function FeedbackButton({ source, supportEmail, knownSender = false, variant = "link", className = "" }: FeedbackButtonProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Prefilled so a message arriving by mail carries the same context the
  // API route would have attached automatically.
  const mailtoHref =
    `mailto:${supportEmail}` +
    `?subject=${encodeURIComponent(`Booktns feedback (${source})`)}` +
    `&body=${encodeURIComponent(`\n\n---\nSent from: ${pathname}`)}`;

  const close = () => {
    setOpen(false);
    // Reset only after a successful send — a failed attempt keeps what the
    // person typed so reopening doesn't lose it.
    if (sent) {
      setSent(false);
      setMessage("");
      setEmail("");
    }
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError("Please tell us what's on your mind.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Dashboard use (knownSender) is authenticated staff — go through the
      // BFF proxy so the API can identify the sender from the session and
      // skip asking for an address it already has. Storefront/landing use
      // has no session to send in the first place, so it hits the API's
      // public endpoint directly.
      if (knownSender) {
        await apiBrowser("/feedback", { method: "POST", body: { message, email: email || undefined, source, path: pathname } });
      } else {
        await apiPublic("/feedback", { method: "POST", body: { message, email: email || undefined, source, path: pathname } });
      }
      setSent(true);
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r)] text-sm transition-all duration-150 hover:bg-[var(--bg3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ac)] ${className}`}
        style={{ color: "var(--tx2)" }}
      >
        <MessageSquarePlus size={15} className="flex-shrink-0" />
        <span className="flex-1 text-left">Give feedback</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs underline underline-offset-2 hover:text-[var(--tx2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ac)] rounded ${className}`}
        style={{ color: "var(--tx3)" }}
      >
        Give feedback
      </button>
    );

  return (
    <>
      {trigger}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Give feedback"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-[var(--rl)] sm:rounded-[var(--rl)] p-5 max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg)", border: "1px solid var(--bd)", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>
                {sent ? "Thanks — we got it" : "Give feedback"}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-1 -m-1 rounded hover:bg-[var(--bg3)]"
                style={{ color: "var(--tx3)" }}
              >
                <X size={16} />
              </button>
            </div>

            {sent ? (
              <>
                <p className="text-sm mb-5" style={{ color: "var(--tx2)" }}>
                  Your message is on its way to the Booktns team. If you left an address we&apos;ll
                  reply there.
                </p>
                <Button type="button" variant="secondary" size="sm" onClick={close}>
                  Close
                </Button>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <p className="text-sm mb-4" style={{ color: "var(--tx2)" }}>
                  Found a bug, or something that could work better? Tell us — it goes straight to
                  the people building Booktns.
                </p>

                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--tx2)" }}>
                  Your feedback
                </label>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={5}
                  maxLength={5000}
                  placeholder="What's working, what isn't, what's missing…"
                  className="w-full px-3 py-2 rounded-[var(--r)] text-sm resize-y focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ac)]"
                  style={{ background: "var(--bg2)", border: "1px solid var(--bds)", color: "var(--tx)" }}
                />

                {!knownSender && (
                  <>
                    <label className="text-xs font-medium block mt-3 mb-1.5" style={{ color: "var(--tx2)" }}>
                      Your email <span style={{ color: "var(--tx3)" }}>(optional — only if you want a reply)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded-[var(--r)] text-sm focus:outline-2 focus:outline-offset-0 focus:outline-[var(--ac)]"
                      style={{ background: "var(--bg2)", border: "1px solid var(--bds)", color: "var(--tx)" }}
                    />
                  </>
                )}

                {error && (
                  <p className="text-xs mt-3" style={{ color: "#B91C1C" }}>
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-5">
                  <Button type="submit" size="sm" loading={submitting}>
                    Send feedback
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={close}>
                    Cancel
                  </Button>
                </div>

                {/* A box this size invites a sentence. Some feedback needs a
                    screenshot, a long reply thread, or just someone's own
                    mail client — so the dialog always offers the plain
                    address rather than being the only way through. */}
                <p className="text-xs mt-4 pt-4" style={{ color: "var(--tx3)", borderTop: "1px solid var(--bds)" }}>
                  Prefer your own email?{" "}
                  <a
                    href={mailtoHref}
                    className="underline underline-offset-2"
                    style={{ color: "var(--ac)" }}
                  >
                    {supportEmail}
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
