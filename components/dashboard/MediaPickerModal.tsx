"use client";

import { useRef, useState } from "react";
import type { Media } from "@/types";
import Button from "@/components/ui/Button";
import { X, Upload, ImageOff } from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

interface MediaPickerModalProps {
  media: Media[];
  onClose: () => void;
  onSelect: (url: string) => void;
  onUploaded: (item: Media) => void;
}

export default function MediaPickerModal({ media, onClose, onSelect, onUploaded }: MediaPickerModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("files", file);

    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Upload failed. Please try again.");
        setUploading(false);
        return;
      }
      const { media: uploaded } = (await res.json()) as { media: Media[] };
      const item = uploaded[0];
      onUploaded(item);
      onSelect(item.url);
      onClose();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 anim-fade-in" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-[var(--rl)] overflow-hidden anim-scale-in"
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>Choose a photo</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
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
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()} className="w-fit">
            <Upload size={14} />
            Upload new photo
          </Button>

          {media.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-10 rounded-[var(--r)] text-center"
              style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
            >
              <ImageOff size={22} style={{ color: "var(--tx3)" }} />
              <p className="text-xs" style={{ color: "var(--tx3)" }}>No photos in your media library yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.url); onClose(); }}
                  className="aspect-square rounded-[var(--r)] overflow-hidden hover:ring-2 transition-all"
                  style={{ background: "var(--bg3)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
