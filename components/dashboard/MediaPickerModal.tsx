"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Media } from "@/types";
import Button from "@/components/ui/Button";
import MediaUploadModal from "@/components/dashboard/MediaUploadModal";
import { X, Upload, ImageOff, Check, Search } from "lucide-react";

interface MediaPickerModalProps {
  selectedUrls: string[];
  maxSelectable: number;
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}

export default function MediaPickerModal({ selectedUrls, maxSelectable, onClose, onConfirm }: MediaPickerModalProps) {
  const [items, setItems] = useState<Media[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const fetchPage = useCallback(async (query: string, cursor: string | null) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/media?${params.toString()}`);
    if (!res.ok) return null;
    return (await res.json()) as { media: Media[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPage(search, null).then((data) => {
      if (cancelled || !data) return;
      setItems(data.media);
      setNextCursor(data.nextCursor);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [search, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPage(search, nextCursor);
    if (data) {
      setItems((prev) => [...prev, ...data.media]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, search, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const remainingSlots = maxSelectable - picked.length;

  const toggle = (url: string) => {
    setPicked((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (remainingSlots <= 0) return prev;
      return [...prev, url];
    });
  };

  const handleConfirm = () => {
    onConfirm(picked);
    close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 anim-fade-in" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className={`w-full max-w-lg max-h-[85vh] flex flex-col rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>
            Choose photos {maxSelectable > 1 && <span style={{ color: "var(--tx3)" }}>· up to {maxSelectable}</span>}
          </h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pt-4 flex-shrink-0 flex flex-col gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowUpload(true)} className="w-fit">
            <Upload size={13} />
            Upload new photo{maxSelectable > 1 ? "s" : ""}
          </Button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tx3)" }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
              placeholder="Search by filename or tag…"
              className="w-full pl-9 pr-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
            />
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-[var(--r)] animate-pulse" style={{ background: "var(--bg3)" }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-10 rounded-[var(--r)] text-center"
              style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
            >
              <ImageOff size={22} style={{ color: "var(--tx3)" }} />
              <p className="text-xs" style={{ color: "var(--tx3)" }}>
                {search ? "No photos match your search" : "No photos in your media library yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {items.map((item) => {
                  const isPicked = picked.includes(item.url);
                  const alreadyOnProduct = selectedUrls.includes(item.url) && !isPicked;
                  const disabled = alreadyOnProduct || (!isPicked && remainingSlots <= 0);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.url)}
                      disabled={disabled}
                      className="relative aspect-square rounded-[var(--r)] overflow-hidden disabled:opacity-40"
                      style={{ background: "var(--bg3)", outline: isPicked ? "2px solid var(--ac)" : "none", outlineOffset: "2px" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.filename} className="w-full h-full object-cover object-top" />
                      {isPicked && (
                        <div className="absolute top-1 right-1 p-1 rounded-full" style={{ background: "var(--ac)" }}>
                          <Check size={11} color="white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <p className="text-center text-xs py-2" style={{ color: "var(--tx3)" }}>Loading more…</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--bd)" }}>
          <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button onClick={handleConfirm} className="flex-1" disabled={picked.length === 0}>
            Add {picked.length > 0 ? picked.length : ""} photo{picked.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {showUpload && (
        <MediaUploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(uploaded) => {
            setItems((prev) => [...uploaded, ...prev]);
            setPicked((prev) => {
              const room = maxSelectable - prev.length;
              return [...prev, ...uploaded.slice(0, Math.max(room, 0)).map((m) => m.url)];
            });
          }}
        />
      )}
    </div>
  );
}
