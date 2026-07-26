"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Media } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MediaUploadModal from "@/components/dashboard/MediaUploadModal";
import MediaViewerModal from "@/components/dashboard/MediaViewerModal";
import { Upload, Trash2, Image as ImageIcon, Search } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MediaClientProps {
  initialMedia: Media[];
  initialNextCursor: string | null;
}

export default function MediaClient({ initialMedia, initialNextCursor }: MediaClientProps) {
  const [mediaList, setMediaList] = useState<Media[]>(initialMedia);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [viewing, setViewing] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState<Media | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (query: string, cursor: string | null) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/media?${params.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as { media: Media[]; nextCursor: string | null };
  }, []);

  // Debounced search — re-fetches page one from scratch whenever the query changes.
  // Skips the very first run: `initialMedia` already covers search="" on mount,
  // so re-fetching there would just duplicate that request.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      const data = await fetchPage(search, null);
      if (cancelled || !data) return;
      setMediaList(data.media);
      setNextCursor(data.nextCursor);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPage(search, nextCursor);
    if (data) {
      setMediaList((prev) => [...prev, ...data.media]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, search, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleDelete = async (item: Media) => {
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setMediaList((prev) => prev.filter((m) => m.id !== item.id));
      }
    } finally {
      setDeletingId(null);
      setDeleting(null);
    }
  };

  const handleUpdated = (updated: Media) => {
    setMediaList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setViewing(updated);
  };

  return (
    <div>
      <Topbar
        title="Media"
        subtitle={`${mediaList.length}${nextCursor ? "+" : ""} file${mediaList.length === 1 && !nextCursor ? "" : "s"}`}
        actions={
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload size={14} />
            Upload
          </Button>
        }
      />

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tx3)" }} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSearching(true); }}
          placeholder="Search by filename or tag…"
          className="w-full max-w-sm pl-9 pr-3 py-2.5 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
          style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
        />
      </div>

      {mediaList.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
          style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
        >
          <ImageIcon size={28} style={{ color: "var(--tx3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
            {search ? `No photos match "${search}"` : "No media yet"}
          </p>
          {!search && (
            <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
              Upload photos here to use them on your products, services, and storefront.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${searching ? "opacity-50" : ""} transition-opacity`}>
            {mediaList.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--rl)] overflow-hidden group relative cursor-pointer"
                style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
                onClick={() => setViewing(item)}
              >
                <div className="w-full aspect-square" style={{ background: "var(--bg3)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--tx)" }}>{item.filename}</p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>{formatFileSize(item.sizeBytes)}</p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bds)", color: "var(--tx3)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleting(item); }}
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

          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <p className="text-center text-sm py-4" style={{ color: "var(--tx3)" }}>Loading more…</p>
          )}
        </>
      )}

      {showUpload && (
        <MediaUploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(uploaded) => setMediaList((prev) => [...uploaded, ...prev])}
        />
      )}

      {viewing && (
        <MediaViewerModal
          media={viewing}
          onClose={() => setViewing(null)}
          onUpdated={handleUpdated}
          onDeleted={(id) => setMediaList((prev) => prev.filter((m) => m.id !== id))}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete photo"
          message={`Delete "${deleting.filename}"? This can't be undone, and any product using it will lose its photo.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
