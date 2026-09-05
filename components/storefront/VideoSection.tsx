import { Clapperboard } from "lucide-react";
import VideoCard from "@/components/storefront/VideoCard";
import type { VendorVideo } from "@/types";

// Used when the vendor hasn't written their own heading. Kept here rather
// than as a database default so an existing vendor's section changes wording
// with the code, and so an empty title in the dashboard clearly means
// "use the default" rather than "show nothing".
const DEFAULT_TITLE = "See us in action";
const DEFAULT_SUBTITLE = "Watch our work on YouTube, TikTok, and Instagram";

interface VideoSectionProps {
  videos: VendorVideo[];
  title?: string;
  subtitle?: string;
}

// A dedicated home for a vendor's video content. The first video gets a
// double-width slot: a vendor who has gone to the trouble of adding videos
// usually has one they most want seen, and an even grid gives them no way to
// say which. Ordering is the vendor's own (displayOrder), so "first" is a
// choice they already control from /dashboard/videos.
export default function VideoSection({ videos, title, subtitle }: VideoSectionProps) {
  if (videos.length === 0) return null;

  const [featured, ...rest] = videos;

  return (
    <section
      id="videos"
      className="px-4 md:px-8 py-14"
      style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--ac-bg)" }}
          >
            <Clapperboard size={18} style={{ color: "var(--ac)" }} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold" style={{ color: "var(--tx)" }}>
              {title || DEFAULT_TITLE}
            </h2>
            <p className="text-base mt-1" style={{ color: "var(--tx3)" }}>
              {subtitle || DEFAULT_SUBTITLE}
            </p>
          </div>
        </div>

        {/* The featured slot spans two columns from md up; below that
            everything stacks, where a "larger" card would mean nothing. */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <VideoCard video={featured} featured />
          </div>
          {rest.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  );
}
