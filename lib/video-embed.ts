// Pure URL parsing/building — safe to import from both client and server
// code. Network calls (oEmbed thumbnail resolution) live in lib/oembed.ts,
// which is server-only.

export type VideoPlatform = "youtube" | "tiktok" | "vimeo" | "instagram" | "other";

export function detectVideoPlatform(url: string): VideoPlatform {
  try {
    const { hostname } = new URL(url);
    if (hostname === "youtu.be" || /(^|\.)youtube\.com$/.test(hostname)) return "youtube";
    if (/(^|\.)tiktok\.com$/.test(hostname)) return "tiktok";
    if (/(^|\.)vimeo\.com$/.test(hostname)) return "vimeo";
    if (/(^|\.)instagram\.com$/.test(hostname)) return "instagram";
    return "other";
  } catch {
    return "other";
  }
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

// Muted-autoplay embed URL for a hover preview, or null when the platform
// doesn't support simple iframe embedding. TikTok and Instagram both require
// their own script-based embed widgets (a <blockquote> + platform JS, not a
// plain iframe), which isn't a good fit for a lightweight hover-to-preview
// interaction, so those stay thumbnail-only.
export function getHoverEmbedUrl(url: string): string | null {
  const platform = detectVideoPlatform(url);

  if (platform === "youtube") {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${id}`;
  }

  if (platform === "vimeo") {
    const id = extractVimeoId(url);
    if (!id) return null;
    return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&background=1`;
  }

  return null;
}
