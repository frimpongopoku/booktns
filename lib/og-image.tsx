/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- every <img>
   here is rendered by Satori into a static PNG. next/image can't run inside an
   ImageResponse tree, and alt text has no meaning in a flattened image. */
import { ImageResponse } from "next/og";
import { STOREFRONT_THEMES, type StorefrontTheme } from "@/lib/theme";
import { loadInterFonts } from "@/lib/fonts";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

interface BrandCardOptions {
  title: string;
  subtitle?: string;
  theme?: StorefrontTheme;
  // Vendor branding, resolved to PNG data URIs by the caller (Satori cannot
  // decode the WebP that lib/image.ts stores everything as, and cannot fetch
  // remote URLs itself). Both optional — a vendor who has uploaded neither
  // still gets the themed gradient card this started as.
  logoDataUri?: string | null;
  coverDataUri?: string | null;
  // Short facts rendered as pills along the bottom — service count, price
  // from, opening hours. This is what makes a shared storefront link say
  // something about the shop rather than just naming it.
  facts?: string[];
}

export async function renderBrandCard({ title, subtitle, theme = "Red", logoDataUri, coverDataUri, facts = [] }: BrandCardOptions) {
  const palette = STOREFRONT_THEMES[theme];
  const fonts = await loadInterFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: `linear-gradient(135deg, ${palette.light} 0%, ${palette.light2} 45%, #09090B 100%)`,
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* The vendor's own cover photo, dimmed hard so the overlaid text
            keeps its contrast whatever the photo happens to be. */}
        {coverDataUri && (
          <img
            src={coverDataUri}
            width={ogImageSize.width}
            height={ogImageSize.height}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.34 }}
          />
        )}
        {coverDataUri && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              background: "linear-gradient(100deg, rgba(9,9,11,0.82) 0%, rgba(9,9,11,0.55) 48%, rgba(9,9,11,0.15) 100%)",
            }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          {logoDataUri && (
            <img
              src={logoDataUri}
              width={92}
              height={92}
              style={{ borderRadius: 20, marginRight: 24, objectFit: "cover", border: "3px solid rgba(255,255,255,0.85)" }}
            />
          )}
          <span style={{ display: "flex", fontSize: 40, fontWeight: 700, color: palette.dark2 }}>
            book
          </span>
          <span style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#FFFFFF" }}>
            tns
          </span>
          <span
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 999,
              background: palette.dark2,
              marginLeft: 6,
              marginBottom: 8,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 62,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "rgba(255,255,255,0.7)",
              marginTop: 20,
            }}
          >
            {subtitle}
          </div>
        )}
        {facts.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 34 }}>
            {facts.map((fact) => (
              <div
                key={fact}
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#FFFFFF",
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  borderRadius: 999,
                  padding: "10px 24px",
                  marginRight: 14,
                  marginTop: 12,
                }}
              >
                {fact}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...ogImageSize, fonts }
  );
}

interface IconMarkOptions {
  size: number;
}

// A bold, uppercase "B" in Inter on the brand gradient — checked at a real
// 16px browser-tab render, not just at a large preview size, since that's
// the size this actually has to hold up at. The slight translateY nudges
// the glyph down from Satori's default vertical centering, which otherwise
// reads a hair high because of Inter's cap-height/baseline metrics.
export async function renderIconMark({ size }: IconMarkOptions) {
  const fonts = await loadInterFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #C0283A 0%, #8C1827 100%)",
          borderRadius: Math.round(size * 0.22),
        }}
      >
        <span
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontWeight: 700,
            fontSize: Math.round(size * 0.56),
            color: "#FFFFFF",
            lineHeight: 1,
            transform: `translateY(${Math.round(size * 0.02)}px)`,
          }}
        >
          B
        </span>
      </div>
    ),
    { width: size, height: size, fonts }
  );
}

interface VendorIconOptions {
  size: number;
  // Already transcoded to a PNG data URI by the caller — Satori can neither
  // fetch a remote URL nor decode the WebP that lib/image.ts stores every
  // upload as. Null when the vendor hasn't uploaded a logo, or the fetch
  // failed.
  logoDataUri: string | null;
}

// A vendor's own logo as the favicon of their storefront. Falls back to the
// Booktns mark rather than inventing a monogram: a vendor who hasn't
// uploaded a logo should see exactly what they saw before this existed.
//
// Rendered through Satori to a fixed square PNG rather than pointing the
// <link rel="icon"> straight at the stored file, because that file is an
// arbitrary vendor upload — up to 2000px, in WebP, at whatever aspect ratio
// they cropped to. A 16px browser tab wants none of that.
export async function renderVendorIconMark({ size, logoDataUri }: VendorIconOptions) {
  if (!logoDataUri) return renderIconMark({ size });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
          borderRadius: Math.round(size * 0.22),
          overflow: "hidden",
        }}
      >
        <img src={logoDataUri} width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    ),
    { width: size, height: size }
  );
}
