import { readFile } from "fs/promises";
import path from "path";

export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
}

let fontsCache: SatoriFont[] | null = null;

// Inter, bundled locally rather than fetched at render time. Shared by the
// PDFs (lib/pdf.ts) and the OG cards (lib/og-image.tsx) — both render through
// Satori, and both need a real font for the same concrete reason: the default
// fallback has no glyph for the Ghana cedi sign (₵, U+20B5), so prices came
// out as tofu boxes on any surface that skipped this.
export async function loadInterFonts(): Promise<SatoriFont[]> {
  if (fontsCache) return fontsCache;

  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/Inter-Regular.woff")),
    readFile(path.join(process.cwd(), "public/fonts/Inter-Bold.woff")),
  ]);

  fontsCache = [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ];
  return fontsCache;
}
