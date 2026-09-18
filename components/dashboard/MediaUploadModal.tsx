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
// than just a fixed quality, and cascading through progressively smaller
// dimensions and lower quality until it actually gets there. That distinction
// matters: each photo now uploads as its own request (see UPLOAD_CONCURRENCY
// below), so "does this one file's request ever risk exceeding Vercel's
// 4.5MB-per-invocation body ceiling" is the one question that decides
// whether uploading N files can ever fail purely because of N — and a fixed
// quality alone can't promise an answer for an unusually dense or
// high-resolution source photo. Most people on this platform are uploading
// straight off an iPhone, so this has to actually work for that, not just
// the easy case: the steps below run all the way down to a size any real
// photo lands well under long before the floor, and are generous enough to
// still get pathological/synthetic images there too. Animated GIFs are
// skipped entirely — re-encoding through canvas would flatten them to their
// first frame.
const DIMENSION_STEPS = [2000, 1600, 1200, 900, 600, 400];
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.1;
// Comfortably under Vercel's hard, non-configurable 4.5MB request-body
// ceiling (same on every plan) — real photos at the defaults above land
// nowhere near this; the margin exists for the rare source image that
// resists compression.
const TARGET_MAX_BYTES = 3.5 * 1024 * 1024;
// Absolute backstop, checked right before a file is sent — independent of
// whether compression actually ran. The compression cascade below is
// exhaustive enough that it should always land under TARGET_MAX_BYTES for
// anything it can decode at all (including HEIC, via the fallback below);
// this only still matters for a file that's genuinely corrupt or in a format
// neither path can open, where compressImageFile has no choice but to hand
// back the untouched original. Below this, refuse to send and say so clearly
// instead of letting an oversized file hit the network and come back as an
// opaque, unparseable "413" with no indication of which file or why.
const SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;

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

// createImageBitmap can't decode HEIC/HEIF at all in most non-Apple browsers
// (Chrome, Firefox, Edge on Windows/Android/Linux) — and that's the format
// iPhones save photos in by default, so it's the common case here, not an
// edge case. heic2any (WASM-based, client-side, no server round trip) is the
// fallback specifically for that: convert to JPEG first, then decode the
// *result* through the normal path below. Dynamically imported — it pulls in
// a real WASM decoder, and the large majority of uploads are already a
// browser-native format that never needs it at all.
async function decodeBitmap(file: File): Promise<{ bitmap: ImageBitmap; convertedFromHeic: boolean }> {
  try {
    return { bitmap: await createImageBitmap(file), convertedFromHeic: false };
  } catch {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    return { bitmap: await createImageBitmap(jpegBlob), convertedFromHeic: true };
  }
}

async function compressImageFile(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  let convertedFromHeic: boolean;
  try {
    ({ bitmap, convertedFromHeic } = await decodeBitmap(file));
  } catch {
    // Genuinely undecodable (corrupt file, or a format neither canvas nor
    // heic2any can open) — let the original through and let SAFE_UPLOAD_BYTES
    // (or the backend's own validation) catch it with a real error, rather
    // than silently dropping the vendor's photo here.
    return file;
  }

  let best: Blob | null = null;

  // Quality first (cheaper visual trade), dimension only if quality alone
  // can't get under the target — the vast majority of real photos succeed on
  // the very first pass (2000px, quality 0.82) and this loop exits
  // immediately; it only cascades further for genuinely pathological source
  // images, all the way down to a floor no real photo should ever reach.
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

  if (!best) return file;
  // A tiny already-optimized source (e.g. a small PNG icon) can re-encode
  // larger as JPEG — never hand back something bigger than we started with.
  // Doesn't apply to a HEIC source: the raw original there isn't a valid
  // fallback at all (browsers can't display it back in the gallery, and nor
  // can most of what downstream reads it), so the re-encode is used
  // regardless of the size comparison.
  if (!convertedFromHeic && best.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([best], newName, { type: "image/jpeg" });
}

// Each photo is its own request — not batched — so the number of files a
// vendor selects can never itself be what causes an upload to fail; only an
// individual file being too large after compression can (and the cascade
// above is built so that's vanishingly rare). This concurrency cap is what
// keeps the whole pipeline (compress, then upload) safe *and* fast: it runs
// in parallel up to this limit rather than one file at a time (slow for 20
// photos, and HEIC decoding is real CPU work) or all at once (many
// simultaneous serverless invocations is what caused the original
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
    const originals = pending.map((p) => p.file);

    const uploaded: Media[] = [];
    const failed: string[] = [];

    // Compress-then-upload runs as one pipeline per file, not compress-all
    // followed by upload-all — a file starts uploading as soon as it's ready
    // instead of every file waiting on the slowest one (HEIC decoding is real
    // CPU work) to finish first. however many files are staged, only
    // UPLOAD_CONCURRENCY of these pipelines are ever in flight at once — see
    // the constant's comment above.
    let cursor = 0;
    async function worker() {
      while (cursor < originals.length) {
        const original = originals[cursor++];

        let file: File;
        try {
          file = await compressImageFile(original);
        } catch {
          failed.push(`${original.name} (couldn't be processed)`);
          continue;
        }

        // Refuse before ever hitting the network — see SAFE_UPLOAD_BYTES.
        if (file.size > SAFE_UPLOAD_BYTES) {
          failed.push(`${file.name} (couldn't be compressed enough to upload — try a different photo)`);
          continue;
        }

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

    const workerCount = Math.min(UPLOAD_CONCURRENCY, originals.length);
    await Promise.all(Array.from({ length: workerCount }, worker));

    // Whatever succeeded is real and worth keeping even if something else
    // failed — losing it because one file failed would be worse than the
    // partial-success state this leaves the vendor in.
    if (uploaded.length > 0) onUploaded(uploaded);

    if (failed.length > 0) {
      const shown = failed.slice(0, 3).join(", ");
      const rest = failed.length > 3 ? `, +${failed.length - 3} more` : "";
      setError(
        `${failed.length} of ${originals.length} photo${originals.length > 1 ? "s" : ""} failed to upload: ${shown}${rest}` +
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
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
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
              <p className="text-xs" style={{ color: "var(--tx3)" }}>JPEG, PNG, WebP, GIF, or straight from an iPhone (HEIC) — resized automatically, upload as many as you like</p>
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
