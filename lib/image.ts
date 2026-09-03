import sharp from "sharp";

// Longest edge for stored images — comfortably covers full-bleed storefront/
// product display sizes without keeping full camera-resolution originals.
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 82;

export interface CompressedImage {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

function withWebpExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return `${base}.webp`;
}

// Animated GIFs are passed through untouched — re-encoding would collapse
// them to a single frame. Everything else is re-encoded to WebP (better
// compression than JPEG/PNG at equivalent visual quality) and downsized so
// stored files stay small regardless of the original camera resolution.
export async function compressImage(buffer: Buffer, contentType: string, filename: string): Promise<CompressedImage> {
  if (contentType === "image/gif") {
    return { buffer, contentType, filename };
  }

  const compressed = await sharp(buffer)
    .rotate() // apply EXIF orientation before stripping metadata
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { buffer: compressed, contentType: "image/webp", filename: withWebpExtension(filename) };
}

// Default longest edge for images embedded in a generated document. Logos
// render at well under 200px in both the PDFs and the OG cards; anything
// larger is wasted bytes in a base64 data URI held in memory. Callers
// embedding a full-bleed background (a 1200x630 OG card) pass their own.
const EMBED_MAX_DIMENSION = 400;

// Fetches a stored image and returns it as a PNG data URI, or null if it
// can't be fetched or decoded.
//
// The transcode is the point, not an optimisation: Satori — which renders
// both the PDFs (lib/pdf.ts) and the OG cards (lib/og-image.tsx) — cannot
// decode WebP, and compressImage() above re-encodes every single upload to
// WebP. So passing a stored URL straight through silently produced a
// blank space where the vendor's logo should be, for every vendor, in
// every generated document. PNG is the format Satori handles reliably.
export async function fetchImageAsPngDataUri(url: string, maxDimension: number = EMBED_MAX_DIMENSION): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // A missing or corrupt image must never take down PDF generation or an
    // OG route — callers fall back to a logo-less layout.
    return null;
  }
}
