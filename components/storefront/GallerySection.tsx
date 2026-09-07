"use client";

import { useCallback, useEffect, useState } from "react";
import { Images, Expand, X, ChevronLeft, ChevronRight } from "lucide-react";

// Used when the vendor hasn't written their own heading. Kept here rather
// than as a database default so an existing vendor's section changes wording
// with the code, and so an empty title in the dashboard clearly means
// "use the default" rather than "show nothing".
const DEFAULT_TITLE = "Our Gallery";
const DEFAULT_DESCRIPTION = "A closer look at our work";

interface GallerySectionProps {
  images: string[];
  title?: string;
  description?: string;
}

// A vendor's own photo showcase. Opt-in through content alone: the section
// simply doesn't exist until at least one photo is picked from
// /dashboard/settings — there's no separate toggle to also manage. Client
// component (not just the grid) because the lightbox needs click/keyboard
// state — there's no server-rendered data to lose by making the whole thing
// client-side.
export default function GallerySection({ images, title, description }: GallerySectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const showPrev = useCallback(() => setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)), [images.length]);
  const showNext = useCallback(() => setOpenIndex((i) => (i === null ? null : (i + 1) % images.length)), [images.length]);

  // Keyboard nav + background scroll lock, only while the lightbox is open.
  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close, showPrev, showNext]);

  if (images.length === 0) return null;

  const heading = title || DEFAULT_TITLE;

  return (
    <>
      <section
        id="gallery"
        className="px-4 md:px-8 py-14"
        style={{ borderTop: "1px solid var(--bds)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--ac-bg)" }}
            >
              <Images size={18} style={{ color: "var(--ac)" }} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-semibold" style={{ color: "var(--tx)" }}>
                {heading}
              </h2>
              <p className="text-base mt-1" style={{ color: "var(--tx3)" }}>
                {description || DEFAULT_DESCRIPTION}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((url, i) => (
              <button
                type="button"
                key={url}
                onClick={() => setOpenIndex(i)}
                aria-label={`View ${heading} photo ${i + 1} of ${images.length}`}
                className="group relative aspect-square rounded-[var(--rl)] overflow-hidden transition-transform duration-150 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--ac)] focus:ring-offset-2"
                style={{ background: "var(--bg3)", boxShadow: "var(--shadow-sm)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${heading} photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150"
                  style={{ background: "rgba(0,0,0,0.35)" }}
                >
                  <Expand size={20} color="white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${heading} — photo ${openIndex + 1} of ${images.length}`}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade-in"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: "white" }}
          >
            <X size={22} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showPrev(); }}
                aria-label="Previous photo"
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full transition-colors hover:bg-white/10"
                style={{ color: "white" }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); showNext(); }}
                aria-label="Next photo"
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 rounded-full transition-colors hover:bg-white/10"
                style={{ color: "white" }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIndex]}
            alt={`${heading} photo ${openIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-[var(--r)]"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
            >
              {openIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
