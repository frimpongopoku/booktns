import { ImageResponse } from "next/og";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

interface BrandCardOptions {
  title: string;
  subtitle?: string;
}

export function renderBrandCard({ title, subtitle }: BrandCardOptions) {
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
          background: "linear-gradient(135deg, #C0283A 0%, #7A1524 45%, #09090B 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          <span style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#F08898" }}>
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
              background: "#F08898",
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
      </div>
    ),
    ogImageSize
  );
}

interface IconMarkOptions {
  size: number;
}

export function renderIconMark({ size }: IconMarkOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090B",
          borderRadius: Math.round(size * 0.22),
        }}
      >
        <span style={{ display: "flex", fontSize: Math.round(size * 0.58), fontWeight: 700, color: "#D43D50" }}>
          b
        </span>
      </div>
    ),
    { width: size, height: size }
  );
}
