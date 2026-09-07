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

// How much of the 1200-wide card the photo panel claims in the split
// layout below — wide enough that the photo reads as the point of the
// card, not a decoration next to the real content.
const PHOTO_PANEL_WIDTH = 520;

function Wordmark({ palette, size = 40 }: { palette: (typeof STOREFRONT_THEMES)[StorefrontTheme]; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <span style={{ display: "flex", fontSize: size, fontWeight: 700, color: palette.dark2 }}>book</span>
      <span style={{ display: "flex", fontSize: size, fontWeight: 700, color: "#FFFFFF" }}>tns</span>
      <span
        style={{
          display: "flex",
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: 999,
          background: palette.dark2,
          marginLeft: 6,
          marginBottom: size * 0.2,
        }}
      />
    </div>
  );
}

function FactPills({ facts }: { facts: string[] }) {
  if (facts.length === 0) return null;
  return (
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
  );
}

export async function renderBrandCard({ title, subtitle, theme = "Red", logoDataUri, coverDataUri, facts = [] }: BrandCardOptions) {
  const palette = STOREFRONT_THEMES[theme];
  const fonts = await loadInterFonts();
  const infoGradient = `linear-gradient(160deg, ${palette.light} 0%, ${palette.light2} 55%, #09090B 100%)`;

  // A vendor with a real photo (or, failing that, at least a logo) gets a
  // proper two-panel card: the image full-bleed and undimmed on one side,
  // everything else on the other — rather than the old approach of
  // stretching the photo edge-to-edge behind the text and dimming it down
  // to 34% opacity just so the title stayed readable, which buried the one
  // asset a vendor actually uploaded to make their shop recognisable. A
  // vendor with neither falls back to the plain gradient card unchanged.
  if (coverDataUri || logoDataUri) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", fontFamily: "Inter" }}>
          <div
            style={{
              width: PHOTO_PANEL_WIDTH,
              height: "100%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: coverDataUri ? "#09090B" : `linear-gradient(160deg, ${palette.light} 0%, ${palette.dark2} 100%)`,
            }}
          >
            {coverDataUri ? (
              <img
                src={coverDataUri}
                width={PHOTO_PANEL_WIDTH}
                height={ogImageSize.height}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              // No cover photo — the logo itself becomes the visual anchor
              // instead of a small corner badge, so there's still something
              // photographic to look at rather than gradient alone.
              <img
                src={logoDataUri!}
                width={260}
                height={260}
                style={{ borderRadius: 40, objectFit: "cover", border: "6px solid rgba(255,255,255,0.9)" }}
              />
            )}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "64px 64px",
              background: infoGradient,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
              {/* The logo already anchors the photo panel when there's no
                  cover — showing it again here would be redundant. It only
                  reappears as a small badge next to the wordmark when the
                  cover photo took its usual spot. */}
              {coverDataUri && logoDataUri && (
                <img
                  src={logoDataUri}
                  width={56}
                  height={56}
                  style={{ borderRadius: 14, marginRight: 18, objectFit: "cover", border: "2px solid rgba(255,255,255,0.85)" }}
                />
              )}
              <Wordmark palette={palette} />
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                maxWidth: 560,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.7)", marginTop: 18 }}>
                {subtitle}
              </div>
            )}
            <FactPills facts={facts} />
          </div>
        </div>
      ),
      { ...ogImageSize, fonts }
    );
  }

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
        }}
      >
        <div style={{ display: "flex", marginBottom: 44 }}>
          <Wordmark palette={palette} />
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
        <FactPills facts={facts} />
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
