"use client";

import { useState } from "react";
import { Download, FileText, QrCode, Share2 } from "lucide-react";
import Button from "@/components/ui/Button";

interface QrCodeCardProps {
  slug: string;
  vendorName: string;
  published: boolean;
}

type Format = "png" | "pdf" | "bare";

const FILE_LABEL: Record<Format, string> = {
  png: "poster",
  pdf: "print",
  bare: "code",
};

// The vendor's QR, with the ways they'll actually use it: send it to someone,
// save it, print it.
export default function QrCodeCard({ slug, vendorName, published }: QrCodeCardProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const src = (format: Format, download = false) =>
    `/api/qr/${slug}?format=${format}${download ? "&download=1" : ""}`;

  const fileName = (format: Format) => {
    const safe = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${safe}-booktns-${FILE_LABEL[format]}.${format === "pdf" ? "pdf" : "png"}`;
  };

  // Uses the OS share sheet where it exists, which on a phone is what puts
  // the image straight into a WhatsApp chat — the thing vendors actually do
  // with this. A wa.me link can't carry an image, only text, so sharing the
  // file is the only way to send the poster itself.
  //
  // Falls back to a download everywhere else: on desktop there is no share
  // sheet, and a saved file can still be attached by hand.
  const handleShare = async () => {
    setBusy("share");
    setError(null);
    try {
      const res = await fetch(src("png"));
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const file = new File([blob], fileName("png"), { type: "image/png" });

      // canShare({files}) is the real test — some browsers expose navigator.share
      // but refuse files, and calling share() blind then throws.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Book ${vendorName}`,
          text: `Scan to book an appointment at ${vendorName}.`,
        });
      } else {
        triggerDownload(URL.createObjectURL(blob), fileName("png"));
      }
    } catch (err) {
      // An abort is the person closing the share sheet, not a failure.
      if ((err as Error)?.name !== "AbortError") {
        setError("Couldn't share that just now. Try downloading it instead.");
      }
    } finally {
      setBusy(null);
    }
  };

  const triggerDownload = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = (format: Format) => {
    setBusy(format);
    setError(null);
    // A plain navigation to the route, which already sets
    // Content-Disposition: attachment — no blob round trip needed.
    triggerDownload(src(format, true), fileName(format));
    window.setTimeout(() => setBusy(null), 800);
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
        Your QR code
      </p>

      <div
        className="p-4 rounded-[var(--rl)] flex flex-col sm:flex-row gap-5"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <div
          className="w-full sm:w-40 flex-shrink-0 rounded-[var(--r)] overflow-hidden self-start"
          style={{ border: "1px solid var(--bds)", background: "#fff" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src("png")}
            alt={`QR code linking to ${vendorName}'s booking page`}
            className="w-full h-auto block"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm mb-1" style={{ color: "var(--tx)" }}>
            Anyone who scans this lands on your booking page.
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--tx3)" }}>
            Print it for your counter, put it on packaging, or send the poster to a customer.
            It goes straight to your calendar — no app, no account.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={busy === "share"} onClick={handleShare}>
              <Share2 size={13} />
              Share
            </Button>
            <Button variant="secondary" size="sm" loading={busy === "png"} onClick={() => handleDownload("png")}>
              <Download size={13} />
              Poster (PNG)
            </Button>
            <Button variant="secondary" size="sm" loading={busy === "pdf"} onClick={() => handleDownload("pdf")}>
              <FileText size={13} />
              Print (PDF)
            </Button>
            <Button variant="ghost" size="sm" loading={busy === "bare"} onClick={() => handleDownload("bare")}>
              <QrCode size={13} />
              Code only
            </Button>
          </div>

          <p className="text-[11px] mt-3" style={{ color: "var(--tx3)" }}>
            <strong style={{ color: "var(--tx2)" }}>Code only</strong> is the bare square with no
            branding, for dropping into your own artwork.
          </p>

          {error && (
            <p className="text-xs mt-3" style={{ color: "#B91C1C" }}>
              {error}
            </p>
          )}
        </div>
      </div>

      {!published && (
        <p className="text-xs mt-2" style={{ color: "var(--amber)" }}>
          Your storefront isn&apos;t published yet — this code won&apos;t open for anyone but you
          until it is.
        </p>
      )}
    </div>
  );
}
