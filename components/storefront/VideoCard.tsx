"use client";

import { useState } from "react";
import { formatVideoDuration } from "@/lib/data";
import { getHoverEmbedUrl } from "@/lib/video-embed";
import type { VendorVideo } from "@/types";
import { Play } from "lucide-react";

interface VideoCardProps {
  video: VendorVideo;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [previewing, setPreviewing] = useState(false);
  const hoverEmbedUrl = getHoverEmbedUrl(video.url);

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[var(--rl)] overflow-hidden cursor-pointer transition-all duration-200"
      style={{ boxShadow: "var(--shadow-sm)" }}
      onMouseEnter={() => hoverEmbedUrl && setPreviewing(true)}
      onMouseLeave={() => setPreviewing(false)}
    >
      {/* Thumbnail */}
      <div
        className="relative"
        style={{
          aspectRatio: "16/9",
          background: video.thumbnailUrl ? "var(--bg3)" : `linear-gradient(135deg, ${video.gradientFrom} 0%, ${video.gradientTo} 100%)`,
        }}
      >
        {video.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Only relevant for the gradient fallback design */}
        {!video.thumbnailUrl && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)",
            }}
          />
        )}

        {/* Darken on hover — hidden once the live preview takes over */}
        {!previewing && (
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
        )}

        {/* Play button — hidden once the live preview takes over */}
        {!previewing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              }}
            >
              <Play
                size={18}
                className="ml-0.5"
                style={{ color: video.thumbnailUrl ? "var(--ac)" : video.gradientFrom }}
                fill={video.thumbnailUrl ? "var(--ac)" : video.gradientFrom}
              />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {!previewing && video.durationSeconds !== undefined && (
          <div
            className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-xs font-semibold"
            style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
          >
            {formatVideoDuration(video.durationSeconds)}
          </div>
        )}

        {/* Live muted preview — only mounted while hovering, so it stops as
            soon as the pointer leaves. pointer-events-none lets clicks pass
            through to the surrounding <a> instead of being swallowed by the
            iframe, so clicking still opens the real video externally. */}
        {previewing && hoverEmbedUrl && (
          <iframe
            src={hoverEmbedUrl}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ border: 0 }}
            allow="autoplay; encrypted-media"
            title={video.title}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-3.5" style={{ background: "var(--bg2)" }}>
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
        >
          {video.title}
        </p>
        {video.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--tx3)" }}>
            {video.description}
          </p>
        )}
      </div>
    </a>
  );
}
