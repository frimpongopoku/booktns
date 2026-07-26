"use client";

import { useState } from "react";
import type { Media } from "@/types";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { X, ExternalLink, Trash2, Tag, Check } from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaViewerModalProps {
  media: Media;
  onClose: () => void;
  onUpdated: (media: Media) => void;
  onDeleted: (id: string) => void;
}

export default function MediaViewerModal({ media, onClose, onUpdated, onDeleted }: MediaViewerModalProps) {
  const [tagsInput, setTagsInput] = useState(media.tags.join(", "));
  const [savingTags, setSavingTags] = useState(false);
  const [savedTags, setSavedTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const handleSaveTags = async () => {
    setSavingTags(true);
    setError(null);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Couldn't save tags. Please try again.");
        setSavingTags(false);
        return;
      }
      const { media: updated } = (await res.json()) as { media: Media };
      onUpdated(updated);
      setSavingTags(false);
      setSavedTags(true);
      setTimeout(() => setSavedTags(false), 2000);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSavingTags(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/media/${media.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(media.id);
      close();
    }
    setDeleting(false);
    setConfirmingDelete(false);
  };

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold truncate pr-4" style={{ color: "var(--tx)" }}>{media.filename}</h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors flex-shrink-0" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="w-full flex items-center justify-center p-4" style={{ background: "var(--bg2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.url} alt={media.filename} className="max-w-full max-h-[50vh] rounded-[var(--r)] object-contain" />
          </div>

          <div className="p-5 flex flex-col gap-4">
            {error && (
              <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
                {error}
              </div>
            )}

            <a
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium w-fit"
              style={{ color: "var(--ac)" }}
            >
              <ExternalLink size={13} />
              View full size in new tab
            </a>

            <div className="text-xs" style={{ color: "var(--tx3)" }}>
              {formatFileSize(media.sizeBytes)} · {media.contentType} · uploaded {new Date(media.createdAt).toLocaleDateString()}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--tx2)" }}>
                <Tag size={12} />
                Tags
              </label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. hair, before-after, summer"
                className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
                style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
              />
              <p className="text-xs" style={{ color: "var(--tx3)" }}>Comma-separated — helps you search for this photo later</p>
              <Button size="sm" variant="secondary" loading={savingTags} onClick={handleSaveTags} className="w-fit">
                {savedTags ? <><Check size={13} /> Saved</> : "Save tags"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="danger" size="sm" loading={deleting} onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={13} />
            Delete photo
          </Button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete photo"
          message={`Delete "${media.filename}"? This can't be undone, and any product using it will lose its photo.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
