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
// the work — but goes further, targeting a real byte-size ceiling rather
// than just a fixed quality. That distinction matters: each photo now
// uploads as its own request (see UPLOAD_CONCURRENCY below), so "does this
// one file's request ever risk exceeding Vercel's 4.5MB-per-invocation body
// ceiling" is the one question that decides whether uploading N files can
// ever fail purely because of N — and a fixed quality alone can't promise an
// answer for an unusually dense or high-resolution source photo. Animated
// GIFs are skipped entirely — re-encoding through canvas would flatten them
// to their first frame.
const DIMENSION_STEPS = [2000, 1600, 1200, 900];
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;
// Comfortably under Vercel's hard, non-configurable 4.5MB request-body
// ceiling (same on every plan) — real photos at the defaults above land
// nowhere near this; the margin exists for the rare source image that
// resists compression.
const TARGET_MAX_BYTES = 3.5 * 1024 * 1024;

function encodeAt(bitmap: ImageBitmap, maxDimension: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function compressImageFile(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    let best: Blob | null = null;

    // Quality first (cheaper visual trade), dimension only if quality alone
    // can't get under the target — the vast majority of real photos succeed
    // on the very first pass (2000px, quality 0.82) and this loop exits
    // immediately; it only cascades further for genuinely pathological
    // source images.
    dimensionSteps:
    for (const maxDimension of DIMENSION_STEPS) {
      for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= QUALITY_STEP) {
        const blob = await encodeAt(bitmap, maxDimension, quality);
        if (!blob) continue;
        best = blob;
        if (blob.size <= TARGET_MAX_BYTES) break dimensionSteps;
      }
    }
    bitmap.close();

    // A tiny already-optimized source (e.g. a small PNG icon) can re-encode
    // larger as JPEG — never hand back something bigger than we started with.
    if (!best || best.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([best], newName, { type: "image/jpeg" });
  } catch {
    // Decoding failure (corrupt file, unsupported subformat) — let the
    // original through and let the backend's own validation reject it with
    // a real error, rather than silently dropping the vendor's photo here.
    return file;
  }
}

// Each photo is its own request — not batched — so the number of files a
// vendor selects can never itself be what causes an upload to fail; only an
// individual file being too large after compression can. This concurrency
// cap is what keeps that safe *and* fast: uploads run in parallel up to this
// limit rather than one at a time (slow for 20 photos) or all at once
// (many simultaneous serverless invocations is what caused the original
// timeout/rate-limit failures).
const UPLOAD_CONCURRENCY = 3;

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

    const uploaded: Media[] = [];
    const failed: string[] = [];

    // however many files are staged, only UPLOAD_CONCURRENCY uploads are
    // ever in flight at once — see the constant's comment above.
    let cursor = 0;
    async function worker() {
      while (cursor < compressed.length) {
        const file = compressed[cursor++];
        const formData = new FormData();
        formData.append("files", file);
        if (tags.length > 0) formData.append("tags", JSON.stringify(tags));
        try {
          // FormData passes through apiBrowser untouched — see lib/api-client.ts.
          const { media } = await apiBrowser<{ media: Media[] }>("/media", { method: "POST", body: formData });
          uploaded.push(...media);
        } catch (err) {
          // Let it fail — don't stall the others. One bad/oversized file
          // shouldn't take down everything else the vendor selected.
          failed.push(err instanceof ApiError ? `${file.name} (${err.message})` : file.name);
        }
      }
    }

    const workerCount = Math.min(UPLOAD_CONCURRENCY, compressed.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    // Whatever succeeded is real and worth keeping even if something else
    // failed — losing it because one file failed would be worse than the
    // partial-success state this leaves the vendor in.
    if (uploaded.length > 0) onUploaded(uploaded);

    if (failed.length > 0) {
      const shown = failed.slice(0, 3).join(", ");
      const rest = failed.length > 3 ? `, +${failed.length - 3} more` : "";
      setError(
        `${failed.length} of ${compressed.length} photo${compressed.length > 1 ? "s" : ""} failed to upload: ${shown}${rest}` +
          (uploaded.length > 0 ? ` (${uploaded.length} uploaded successfully)` : "")
      );
      setUploading(false);
      return;
    }

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
