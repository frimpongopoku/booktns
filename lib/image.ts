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
