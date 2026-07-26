"use client";

import { useState } from "react";
import type { VendorVideo } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus, X, Pencil, Trash2, Play, ExternalLink, Video as VideoIcon } from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

interface VideoModalProps {
  video?: VendorVideo;
  onClose: () => void;
  onSaved: (v: VendorVideo) => void;
}

function VideoModal({ video, onClose, onSaved }: VideoModalProps) {
  const [title, setTitle] = useState(video?.title ?? "");
  const [description, setDescription] = useState(video?.description ?? "");
  const [url, setUrl] = useState(video?.url ?? "");
  const [duration, setDuration] = useState(video?.durationSeconds ? String(video.durationSeconds) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    setError(null);

    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
      durationSeconds: duration.trim() ? parseInt(duration) : undefined,
    };

    try {
      const res = await fetch(video ? `/api/videos/${video.id}` : "/api/videos", {
        method: video ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(errBody?.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const { video: saved } = (await res.json()) as { video: VendorVideo };
      onSaved(saved);
      close();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className={`w-full max-w-md rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>
            {video ? "Edit Video" : "Add Video"}
          </h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
              {error}
            </div>
          )}
          <Input
            label="Video link"
            placeholder="https://youtube.com/watch?v=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            hint="YouTube, Instagram, TikTok, Vimeo — any public video link"
          />
          <Input label="Title" placeholder="e.g. Knotless Braids Transformation" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Description (optional)" placeholder="Brief description…" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <Input
            label="Duration in seconds (optional)"
            type="number"
            placeholder="45"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            hint="Shown as a badge on the video card"
          />
        </div>
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleSave} className="flex-1" disabled={!title.trim() || !url.trim()}>
            {video ? "Save Changes" : "Add Video"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface VideosClientProps {
  initialVideos: VendorVideo[];
}

export default function VideosClient({ initialVideos }: VideosClientProps) {
  const [videoList, setVideoList] = useState<VendorVideo[]>(initialVideos);
  const [editingVideo, setEditingVideo] = useState<VendorVideo | undefined>();
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<VendorVideo | null>(null);

  const handleSaved = (v: VendorVideo) => {
    setVideoList((prev) => {
      const idx = prev.findIndex((x) => x.id === v.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = v;
        return next;
      }
      return [...prev, v];
    });
  };

  const handleDelete = async (video: VendorVideo) => {
    setDeletingId(video.id);
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (res.ok) {
        setVideoList((prev) => prev.filter((v) => v.id !== video.id));
      }
    } finally {
      setDeletingId(null);
      setDeleting(null);
    }
  };

  return (
    <div>
      <Topbar
        title="Videos"
        subtitle={`${videoList.length} video${videoList.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" onClick={() => { setEditingVideo(undefined); setShowModal(true); }}>
            <Plus size={14} />
            Add Video
          </Button>
        }
      />

      {videoList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <VideoIcon size={28} style={{ color: "var(--tx3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>No videos yet</p>
          <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
            Add links to videos you&apos;ve posted elsewhere — they&apos;ll show up in a &quot;See us in action&quot; section on your storefront.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoList.map((video) => (
            <div
              key={video.id}
              className="rounded-[var(--rl)] overflow-hidden"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <div
                className="relative aspect-video flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${video.gradientFrom} 0%, ${video.gradientTo} 100%)` }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.92)" }}>
                  <Play size={16} className="ml-0.5" style={{ color: video.gradientFrom }} fill={video.gradientFrom} />
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>{video.title}</p>
                {video.description && (
                  <p className="text-xs mb-2 leading-relaxed" style={{ color: "var(--tx3)" }}>{video.description}</p>
                )}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs inline-flex items-center gap-1 mb-3"
                  style={{ color: "var(--ac)" }}
                >
                  View link <ExternalLink size={11} />
                </a>
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => { setEditingVideo(video); setShowModal(true); }}
                    className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors"
                    style={{ color: "var(--tx3)" }}
                    aria-label={`Edit ${video.title}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleting(video)}
                    disabled={deletingId === video.id}
                    className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
                    style={{ color: "var(--tx3)" }}
                    aria-label={`Delete ${video.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <VideoModal
          video={editingVideo}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete video"
          message={`Delete "${deleting.title}"? This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
