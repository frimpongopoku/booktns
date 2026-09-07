import { Images } from "lucide-react";

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
// /dashboard/settings — there's no separate toggle to also manage.
export default function GallerySection({ images, title, description }: GallerySectionProps) {
  if (images.length === 0) return null;

  return (
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
              {title || DEFAULT_TITLE}
            </h2>
            <p className="text-base mt-1" style={{ color: "var(--tx3)" }}>
              {description || DEFAULT_DESCRIPTION}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square rounded-[var(--rl)] overflow-hidden transition-transform duration-150 hover:scale-[1.02]"
              style={{ background: "var(--bg3)", boxShadow: "var(--shadow-sm)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${title || DEFAULT_TITLE} photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
