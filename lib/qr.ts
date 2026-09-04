import QRCode from "qrcode";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import { fetchImageAsPngDataUri } from "@/lib/image";
import { loadInterFonts } from "@/lib/fonts";
import { STOREFRONT_THEMES, type StorefrontTheme } from "@/lib/theme";

export interface QrVendorInfo {
  name: string;
  slug: string;
  logoUrl?: string | null;
  storefrontTheme?: StorefrontTheme;
}

// Card geometry, in Satori's coordinate space. Rendered at 2x on the way out,
// so a 900px-wide card becomes 1800px — printed at 4.5 inches that is 400dpi,
// comfortably past the ~300dpi where a QR starts losing edge definition.
//
// Height is tuned to the content: the footer is absolutely positioned at the
// bottom, so an over-tall card shows up as a band of dead white rather than
// as generous spacing.
const CARD_W = 900;
const CARD_H = 1045;
const RENDER_SCALE = 2;

// Level H recovers ~30% of the code, which is what buys room for the badge
// sitting over the centre. Anything lower and the badge starts eating real
// data. `margin: 0` because the card supplies its own quiet zone — QR's own
// 4-module margin would float the code inside a second, larger gap.
const QR_PIXELS = 1000;

async function qrDataUri(url: string): Promise<string> {
  const buffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 0,
    width: QR_PIXELS,
    color: { dark: "#0A0A0B", light: "#FFFFFF" },
  });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function accentColor(vendor: QrVendorInfo): string {
  return STOREFRONT_THEMES[vendor.storefrontTheme ?? "Red"].light;
}

// Deliberately built as a plain object tree rather than JSX: this is a .ts
// file, matching lib/pdf.ts.
async function buildCardSvg(vendor: QrVendorInfo, url: string, displayUrl: string): Promise<string> {
  const [fonts, qr, logo] = await Promise.all([
    loadInterFonts(),
    qrDataUri(url),
    vendor.logoUrl ? fetchImageAsPngDataUri(vendor.logoUrl, 200) : Promise.resolve(null),
  ]);

  const accent = accentColor(vendor);
  const QR_BOX = 560;
  const BADGE = 84;

  const tree = {
    type: "div",
    props: {
      style: {
        width: CARD_W,
        height: CARD_H,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // White, not the vendor's theme colour. This gets printed, often on
        // a label or a sticker, and a coloured ground costs ink and contrast
        // for no scanning benefit. The accent appears as trim instead.
        backgroundColor: "#FFFFFF",
        fontFamily: "Inter",
        padding: 56,
      },
      children: [
        // Accent bar along the top — the only large area of vendor colour.
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: CARD_W,
              height: 14,
              display: "flex",
              backgroundColor: accent,
            },
          },
        },

        // Vendor identity
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: 18, marginTop: 20 },
            children: [
              ...(logo
                ? [
                    {
                      type: "img",
                      props: {
                        src: logo,
                        width: 76,
                        height: 76,
                        style: { borderRadius: 38, objectFit: "cover" },
                      },
                    },
                  ]
                : []),
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#0A0A0B",
                    letterSpacing: "-0.02em",
                    maxWidth: 640,
                  },
                  children: vendor.name,
                },
              },
            ],
          },
        },

        {
          type: "div",
          props: {
            style: { display: "flex", fontSize: 27, color: "#52525B", marginTop: 14 },
            children: "Scan to book an appointment",
          },
        },

        // The code itself, with the badge centred over it.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 44,
              padding: 22,
              backgroundColor: "#FFFFFF",
              border: "3px solid #E4E4E7",
              borderRadius: 28,
            },
            children: [
              { type: "img", props: { src: qr, width: QR_BOX, height: QR_BOX } },
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    width: BADGE,
                    height: BADGE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    // The white ring is what keeps the badge from reading as
                    // part of the code to a scanner.
                    border: "6px solid #FFFFFF",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          width: BADGE - 12,
                          height: BADGE - 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#09090B",
                          borderRadius: 16,
                          fontSize: 44,
                          fontWeight: 700,
                          color: "#D43D50",
                        },
                        children: "b",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // The address, spelled out. Someone photographing this card, or
        // reading it from across a counter, needs to be able to type it.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              marginTop: 40,
              fontSize: 30,
              fontWeight: 600,
              color: "#0A0A0B",
            },
            children: displayUrl,
          },
        },

        // Platform credit, pinned to the bottom.
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              position: "absolute",
              bottom: 44,
              alignItems: "center",
              fontSize: 22,
              color: "#A1A1AA",
            },
            children: [
              { type: "div", props: { style: { display: "flex", marginRight: 8 }, children: "Powered by" } },
              {
                type: "div",
                props: { style: { display: "flex", fontWeight: 700, color: "#C0283A" }, children: "book" },
              },
              {
                type: "div",
                props: { style: { display: "flex", fontWeight: 700, color: "#52525B" }, children: "tns" },
              },
            ],
          },
        },
      ],
    },
  };

  return satori(tree as Parameters<typeof satori>[0], { width: CARD_W, height: CARD_H, fonts });
}

// A shareable, printable card. PNG is what goes to WhatsApp — it previews
// inline in a chat, where a PDF shows only as a file attachment.
export async function generateStorefrontQrPng(
  vendor: QrVendorInfo,
  url: string,
  displayUrl: string,
): Promise<Buffer> {
  const svg = await buildCardSvg(vendor, url, displayUrl);
  return Buffer.from(
    new Resvg(svg, { fitTo: { mode: "width", value: CARD_W * RENDER_SCALE } }).render().asPng(),
  );
}

// PDF for printing. Same artwork, wrapped at the card's own aspect ratio so
// it prints without the letterboxing an A4 page would force.
export async function generateStorefrontQrPdf(
  vendor: QrVendorInfo,
  url: string,
  displayUrl: string,
): Promise<Buffer> {
  const png = await generateStorefrontQrPng(vendor, url, displayUrl);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([CARD_W, CARD_H]);
  const embedded = await pdf.embedPng(png);
  page.drawImage(embedded, { x: 0, y: 0, width: CARD_W, height: CARD_H });

  pdf.setTitle(`${vendor.name} — booking QR code`);
  pdf.setSubject(`Scan to book at ${vendor.name}`);
  pdf.setProducer("Booktns");

  return Buffer.from(await pdf.save());
}

// Bare code, no card. For a vendor putting it into their own artwork — a
// flyer, a shopfront sign, packaging — where the surrounding branding is
// theirs and ours would be in the way.
export async function generateBareQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 1600,
    color: { dark: "#0A0A0B", light: "#FFFFFF" },
  });
}
