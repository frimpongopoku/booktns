"use client";

import { useEffect, useRef, useState } from "react";
import type { Media } from "@/types";
import { apiBrowser, ApiError } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { X, ImagePlus, Upload } from "lucide-react";

interface PendingFile {
  file: File;
  previewUrl: string;
}

interface MediaUploadModalProps {
  onClose: () => void;
  onUploaded: (media: Media[]) => void;
}

// Mirrors the backend's own compressImage() (lib/image.ts: 2000px longest
// edge, quality 82) so a photo looks the same whichever pass actually did
// the work. Doing it here first is the real fix, not a nicety: the backend
// pass only ever ran on whatever bytes survived the network trip, and nine-
// teen full-resolution phone photos bundled into one request routinely blew
// past Vercel's hard per-request body limit before our own code ever saw
// them — surfacing as an opaque "Content Too Large" with no useful message.
// Animated GIFs are skipped — re-encoding through canvas would flatten them
// to their first frame.
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;

async function compressImageFile(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    // A tiny already-optimized source (e.g. a small PNG icon) can re-encode
    // larger as JPEG — never hand back something bigger than we started with.
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Decoding failure (corrupt file, unsupported subformat) — let the
    // original through and let the backend's own validation reject it with
    // a real error, rather than silently dropping the vendor's photo here.
    return file;
  }
}

// Keeps each individual request comfortably under any platform body-size
// ceiling regardless of how many photos are selected at once — compression
// alone helps, but a vendor picking 20+ photos in one go can still add up
// past a few MB combined even after resizing every one of them.
const UPLOAD_BATCH_SIZE = 6;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Shared "select → preview → confirm" upload flow used everywhere a vendor
// uploads images (the media gallery and the product photo picker), so the
// behaviour is identical in both places: nothing is sent to the server until
// the vendor reviews the previews and explicitly clicks Upload.
export default function MediaUploadModal({ onClose, onUploaded }: MediaUploadModalProps) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<PendingFile[]>([]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const handleSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const additions = Array.from(fileList).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPending((prev) => [...prev, ...additions]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAt = (index: number) => {
    setPending((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (pending.length === 0) return;
    setUploading(true);
    setError(null);

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const compressed = await Promise.all(pending.map((p) => compressImageFile(p.file)));
    const batches = chunk(compressed, UPLOAD_BATCH_SIZE);

    const uploaded: Media[] = [];
    for (const batch of batches) {
      const formData = new FormData();
      batch.forEach((file) => formData.append("files", file));
      if (tags.length > 0) formData.append("tags", JSON.stringify(tags));

      try {
        // FormData passes through apiBrowser untouched — see lib/api-client.ts.
        const { media } = await apiBrowser<{ media: Media[] }>("/media", { method: "POST", body: formData });
        uploaded.push(...media);
      } catch (err) {
        // Whatever uploaded before this batch failed is real and worth
        // keeping — losing it because a later batch failed would be worse
        // than the partial-success state this leaves the vendor in.
        if (uploaded.length > 0) onUploaded(uploaded);
        setError(
          err instanceof ApiError
            ? `${err.message}${uploaded.length > 0 ? ` (${uploaded.length} photo${uploaded.length > 1 ? "s" : ""} uploaded before this)` : ""}`
            : "Couldn't reach the server. Check your connection and try again."
        );
        setUploading(false);
        return;
      }
    }

    onUploaded(uploaded);
    close();
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>Upload photos</h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => handleSelect(e.target.files)}
          />

          {pending.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 py-10 rounded-[var(--r)] text-center transition-colors hover:bg-[var(--bg3)]"
              style={{ background: "var(--bg2)", border: "2px dashed var(--bds)" }}
            >
              <ImagePlus size={24} style={{ color: "var(--tx3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Select photos</p>
              <p className="text-xs" style={{ color: "var(--tx3)" }}>JPEG, PNG, WebP, or GIF — resized automatically, upload as many as you like</p>
            </button>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {pending.map((p, i) => (
                  <div key={p.previewUrl} className="relative aspect-square rounded-[var(--r)] overflow-hidden" style={{ background: "var(--bg3)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeAt(i)}
                      className="absolute top-1 right-1 p-1 rounded-full"
                      style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                      aria-label={`Remove ${p.file.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-[var(--r)] flex items-center justify-center transition-colors hover:bg-[var(--bg3)]"
                  style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
                  aria-label="Add more photos"
                >
                  <ImagePlus size={18} style={{ color: "var(--tx3)" }} />
                </button>
              </div>

              <Input
                label="Tags (optional)"
                placeholder="e.g. hair, before-after, summer"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                hint="Comma-separated — applied to all selected photos, helps you search later"
              />
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button loading={uploading} onClick={handleUpload} className="flex-1" disabled={pending.length === 0}>
            <Upload size={14} />
            Upload {pending.length > 0 ? `${pending.length} photo${pending.length > 1 ? "s" : ""}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
