"use client";

import { useRef, useState } from "react";
import type { Media } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Button from "@/components/ui/Button";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaClientProps {
  initialMedia: Media[];
}

export default function MediaClient({ initialMedia }: MediaClientProps) {
  const [mediaList, setMediaList] = useState<Media[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    Array.from(fileList).forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Upload failed. Please try again.");
        setUploading(false);
        return;
      }
      const { media } = (await res.json()) as { media: Media[] };
      setMediaList((prev) => [...media, ...prev]);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (item: Media) => {
    if (!confirm(`Delete "${item.filename}"? This can't be undone, and any product using it will lose its photo.`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== item.id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <Topbar
        title="Media"
        subtitle={`${mediaList.length} file${mediaList.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Upload
          </Button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm mb-4" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {mediaList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <ImageIcon size={28} style={{ color: "var(--tx3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>No media yet</p>
          <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
            Upload photos here to use them on your products, services, and storefront.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaList.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--rl)] overflow-hidden group relative"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <div className="w-full aspect-square" style={{ background: "var(--bg3)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-medium truncate" style={{ color: "var(--tx)" }}>{item.filename}</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>{formatFileSize(item.sizeBytes)}</p>
              </div>
              <button
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                aria-label={`Delete ${item.filename}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
