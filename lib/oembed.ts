import { detectVideoPlatform, type VideoPlatform } from "@/lib/video-embed";

const OEMBED_ENDPOINTS: Partial<Record<VideoPlatform, (url: string) => string>> = {
  youtube: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  vimeo: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
};

// Best-effort thumbnail resolution via each platform's public, unauthenticated
// oEmbed API. Instagram has no such public endpoint — its oEmbed API has
// required a Meta developer app + access token since the 2020 Graph API
// changes, so Instagram links always fall back to the decorative
// gradient+play-button card. A failed/timed-out request never blocks video
// creation — thumbnail is a nice-to-have, not a requirement.
export async function resolveVideoThumbnail(url: string): Promise<string | null> {
  const platform = detectVideoPlatform(url);
  const buildEndpoint = OEMBED_ENDPOINTS[platform];
  if (!buildEndpoint) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(buildEndpoint(url), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: unknown };
    return typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;
  } catch {
    return null;
  }
}
