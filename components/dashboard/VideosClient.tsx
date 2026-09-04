"use client";

import { useState } from "react";
import type { VendorVideo, Vendor } from "@/types";
import { apiBrowser, ApiError } from "@/lib/api-client";
import Topbar from "@/components/dashboard/Topbar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { AutoSaveBadge, ManualSaveBadge, UnsavedChangesBar } from "@/components/dashboard/SaveState";
import { Plus, X, Pencil, Trash2, Play, ExternalLink, Video as VideoIcon } from "lucide-react";

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
      const { video: saved } = await apiBrowser<{ video: VendorVideo }>(
        video ? `/videos/${video.id}` : "/videos",
        { method: video ? "PATCH" : "POST", body },
      );
      onSaved(saved);
      close();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Check your connection and try again.");
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

type VideoSectionVendor = Pick<Vendor, "showVideoSection" | "videoSectionTitle" | "videoSectionSubtitle">;

interface SectionSettingsProps {
  vendor: VideoSectionVendor;
}

// Controls for the storefront section these videos appear in — deliberately
// here rather than buried in Settings, since a vendor deciding whether to
// show their videos is already looking at their videos.
function SectionSettings({ vendor }: SectionSettingsProps) {
  const [enabled, setEnabled] = useState(vendor.showVideoSection);
  const [togglingSection, setTogglingSection] = useState(false);

  const [saved, setSaved] = useState({
    title: vendor.videoSectionTitle ?? "",
    subtitle: vendor.videoSectionSubtitle ?? "",
  });
  const [title, setTitle] = useState(saved.title);
  const [subtitle, setSubtitle] = useState(saved.subtitle);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== saved.title || subtitle !== saved.subtitle;

  const patchVendor = async (body: Record<string, unknown>) => {
    try {
      await apiBrowser("/vendor", { method: "PATCH", body });
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  };

  // The switch writes immediately — flipping a toggle and then hunting for a
  // Save button is exactly the confusion the badge next to it rules out.
  const handleToggle = async () => {
    const next = !enabled;
    setTogglingSection(true);
    setError(null);
    try {
      await patchVendor({ showVideoSection: next });
      setEnabled(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setTogglingSection(false);
    }
  };

  const handleSaveHeadings = async () => {
    setSaving(true);
    setError(null);
    try {
      await patchVendor({
        videoSectionTitle: title.trim() || null,
        videoSectionSubtitle: subtitle.trim() || null,
      });
      setSaved({ title, subtitle });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="p-4 rounded-[var(--rl)] mb-6 flex flex-col gap-4"
      style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
    >
      {error && (
        <div className="px-3 py-2 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--tx)" }}>
            Show videos on my storefront
            <AutoSaveBadge />
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>
            {enabled
              ? "Your videos appear in their own section on your storefront home page."
              : "The section is hidden. Your videos are kept — nothing here is deleted."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show videos on my storefront"
          disabled={togglingSection}
          onClick={handleToggle}
          className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ac)] focus:ring-offset-2"
          style={{ background: enabled ? "var(--ac)" : "var(--bg3)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
            style={{ left: enabled ? "1.375rem" : "0.125rem" }}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-3 pt-4" style={{ borderTop: "1px solid var(--bds)" }}>
          <p className="text-xs font-medium flex items-center gap-2" style={{ color: "var(--tx2)" }}>
            Section heading
            <ManualSaveBadge />
          </p>
          <Input
            label="Title"
            placeholder="See us in action"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            hint="Leave blank to use the default"
          />
          <Input
            label="Subtitle"
            placeholder="Watch our work on YouTube, TikTok, and Instagram"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            hint="Leave blank to use the default"
          />
          <UnsavedChangesBar
            dirty={dirty}
            saving={saving}
            justSaved={justSaved}
            onSave={handleSaveHeadings}
            onDiscard={() => { setTitle(saved.title); setSubtitle(saved.subtitle); }}
          />
        </div>
      )}
    </div>
  );
}

interface VideosClientProps {
  initialVideos: VendorVideo[];
  vendor: VideoSectionVendor;
  // Storefront settings are Owner-only (PATCH /api/vendor enforces it), but
  // this page is open to Management too — so the section controls are hidden
  // for them rather than shown as a control that 403s on click.
  canEditSection: boolean;
}

export default function VideosClient({ initialVideos, vendor, canEditSection }: VideosClientProps) {
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
      await apiBrowser(`/videos/${video.id}`, { method: "DELETE" });
      setVideoList((prev) => prev.filter((v) => v.id !== video.id));
    } catch {
      // Silent — a delete failure just leaves the video listed.
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

      {canEditSection && <SectionSettings vendor={vendor} />}

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
                style={{ background: video.thumbnailUrl ? "var(--bg3)" : `linear-gradient(135deg, ${video.gradientFrom} 0%, ${video.gradientTo} 100%)` }}
              >
                {video.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="relative w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.92)" }}>
                  <Play
                    size={16}
                    className="ml-0.5"
                    style={{ color: video.thumbnailUrl ? "var(--ac)" : video.gradientFrom }}
                    fill={video.thumbnailUrl ? "var(--ac)" : video.gradientFrom}
                  />
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
