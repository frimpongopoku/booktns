import type { HeroCardMode, VendorVideo } from "@/types";
import { getHoverEmbedUrl } from "@/lib/video-embed";
import HeroGalleryBackground from "@/components/storefront/HeroGalleryBackground";

interface HeroCardProps {
  name: string;
  location: string;
  coverImageUrl?: string;
  heroCardMode: HeroCardMode;
  heroGalleryUrls: string[];
  heroVideoId?: string;
  videos: VendorVideo[];
}

function CoverImageBackground({ coverImageUrl, name }: { coverImageUrl?: string; name: string }) {
  if (coverImageUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImageUrl}
          alt={`${name} cover`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Legibility gradient over the photo for the text overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)" }}
        />
      </>
    );
  }

  return (
    <>
      {/* Rich gradient background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(145deg, var(--brand-accent-light) 0%, var(--brand-accent-light-2) 45%, #09090B 100%)" }}
      />
      {/* Ambient light shapes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 80%, color-mix(in srgb, var(--brand-accent-dark-2) 20%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.06) 0%, transparent 40%)",
        }}
      />
      {/* Decorative circle */}
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full" style={{ background: "color-mix(in srgb, var(--brand-accent-light) 18%, transparent)" }} />
    </>
  );
}

export default function HeroCard({ name, location, coverImageUrl, heroCardMode, heroGalleryUrls, heroVideoId, videos }: HeroCardProps) {
  const heroVideo = heroCardMode === "Video" ? videos.find((v) => v.id === heroVideoId) : undefined;
  const heroVideoEmbedUrl = heroVideo ? getHoverEmbedUrl(heroVideo.url) : null;

  let background: React.ReactNode;
  if (heroCardMode === "Gallery" && heroGalleryUrls.length > 0) {
    background = (
      <>
        <HeroGalleryBackground images={heroGalleryUrls} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)" }}
        />
      </>
    );
  } else if (heroCardMode === "Video" && heroVideoEmbedUrl) {
    background = (
      <>
        <iframe
          src={heroVideoEmbedUrl}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ border: 0 }}
          allow="autoplay; encrypted-media"
          title={heroVideo?.title}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)" }}
        />
      </>
    );
  } else {
    background = <CoverImageBackground coverImageUrl={coverImageUrl} name={name} />;
  }

  return (
    <div
      className="hidden md:flex relative rounded-[var(--rl)] overflow-hidden"
      style={{ aspectRatio: "4/3", boxShadow: "var(--shadow-lg)" }}
    >
      {background}
      {/* Open badge */}
      <div
        className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{
          background: "rgba(255,255,255,0.12)",
          color: "white",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
        Open Today
      </div>
      {/* Text content */}
      <div className="relative z-10 flex flex-col justify-end p-8 h-full">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Premium Beauty Studio
        </p>
        <p className="text-3xl font-semibold text-white leading-tight" style={{ letterSpacing: "-0.025em" }}>
          {name}
        </p>
        <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
          {location}
        </p>
      </div>
    </div>
  );
}
