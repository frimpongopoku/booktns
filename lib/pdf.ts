import { readFile } from "fs/promises";
import path from "path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import type { Booking } from "@/types";
import { formatPrice } from "@/lib/data";

// Only what the PDF layout actually renders — avoids requiring a full
// Vendor row just to generate a document.
interface VendorPdfInfo {
  name: string;
  location: string;
  logoUrl?: string | null;
  cancellationPolicy?: string | null;
}

const PAGE_WIDTH = 794; // A4 @ 96dpi
const ROW_HEIGHT = 34;
const BASE_HEIGHT = 480;

let fontsCache: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;

async function loadFonts() {
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

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

function row(label: string, value: string) {
  return {
    type: "div",
    props: {
      style: { display: "flex", justifyContent: "space-between", padding: "6px 0" },
      children: [
        { type: "span", props: { style: { display: "flex", fontSize: 14, color: "#71717A" }, children: label } },
        { type: "span", props: { style: { display: "flex", fontSize: 14, color: "#18181B", fontWeight: 500 }, children: value } },
      ],
    },
  };
}

function sectionLabel(text: string) {
  return {
    type: "div",
    props: {
      style: { display: "flex", fontSize: 11, fontWeight: 700, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 24 },
      children: text,
    },
  };
}

// Renders the Confirmed Booking PDF — vendor logo, confirmation status,
// customer + appointment + services + products, deposit reference code,
// payment details, and the vendor's cancellation policy. Generated once,
// only on the pending -> confirmed transition (see app/api/bookings/[id]).
export async function generateConfirmedBookingPdf(booking: Booking, vendor: VendorPdfInfo): Promise<Buffer> {
  const fonts = await loadFonts();
  const logoDataUri = vendor.logoUrl ? await fetchAsDataUri(vendor.logoUrl) : null;

  const rowCount = booking.services.length + booking.products.length + (vendor.cancellationPolicy ? 3 : 0) + (booking.paymentMethod ? 3 : 0);
  const pageHeight = BASE_HEIGHT + rowCount * ROW_HEIGHT;

  const staffName = booking.assignedStaffName ?? booking.staffPreferenceName;
  const servicesTotal = booking.services.reduce((sum, s) => sum + s.priceAtBooking, 0);

  const tree = {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        fontFamily: "Inter",
        padding: "48px 56px",
      },
      children: [
        // Header
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 24, borderBottom: "2px solid #E4E4E7" },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center" },
                  children: logoDataUri
                    ? [{ type: "img", props: { src: logoDataUri, width: 48, height: 48, style: { borderRadius: 8, marginRight: 14 } } }]
                    : [],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
                  children: [
                    { type: "span", props: { style: { display: "flex", fontSize: 22, fontWeight: 700, color: "#18181B" }, children: vendor.name } },
                    { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#71717A" }, children: vendor.location } },
                  ],
                },
              },
            ],
          },
        },
        // Status
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", marginTop: 24 },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    padding: "6px 16px",
                    background: "#DCFCE7",
                    color: "#15803D",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  },
                  children: "Confirmed",
                },
              },
              { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#A1A1AA", marginLeft: 12 }, children: `Booking ${booking.slug}` } },
            ],
          },
        },
        // Customer + appointment
        {
          type: "div",
          props: {
            style: { display: "flex", justifyContent: "space-between", marginTop: 28 },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" },
                  children: [
                    { type: "span", props: { style: { display: "flex", fontSize: 16, fontWeight: 700, color: "#18181B" }, children: booking.customerName } },
                    { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#71717A", marginTop: 2 }, children: booking.customerPhone } },
                    { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#71717A" }, children: booking.customerEmail } },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
                  children: [
                    { type: "span", props: { style: { display: "flex", fontSize: 14, fontWeight: 500, color: "#18181B" }, children: formatDateTime(booking.startTime) } },
                    {
                      type: "span",
                      props: {
                        style: { display: "flex", fontSize: 13, color: "#71717A", marginTop: 2 },
                        children: `${formatTime(booking.startTime)} — ${formatTime(booking.endTime)}`,
                      },
                    },
                    ...(staffName
                      ? [{ type: "span", props: { style: { display: "flex", fontSize: 13, color: "#71717A" }, children: `with ${staffName}` } }]
                      : []),
                  ],
                },
              },
            ],
          },
        },
        // Services
        sectionLabel("Services"),
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              ...booking.services.map((s) => row(s.name, formatPrice(s.priceAtBooking))),
              row("Total", formatPrice(servicesTotal)),
            ],
          },
        },
        // Products
        ...(booking.products.length > 0
          ? [
              sectionLabel("Products flagged"),
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" },
                  children: booking.products.map((p) => row(`${p.name} × ${p.quantity}`, formatPrice(p.priceAtBooking * p.quantity))),
                },
              },
            ]
          : []),
        // Payment / deposit
        ...(booking.depositAmountPesewas > 0
          ? [
              sectionLabel("Deposit"),
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" },
                  children: [
                    row("Amount", formatPrice(booking.depositAmountPesewas)),
                    ...(booking.depositReferenceCode ? [row("Reference code", booking.depositReferenceCode)] : []),
                    ...(booking.paymentMethod
                      ? [row(booking.paymentMethod.label, booking.paymentMethod.accountNumber ?? booking.paymentMethod.accountName)]
                      : []),
                  ],
                },
              },
            ]
          : []),
        // Cancellation policy
        ...(vendor.cancellationPolicy
          ? [
              sectionLabel("Cancellation policy"),
              { type: "div", props: { style: { display: "flex", fontSize: 13, color: "#52525B", lineHeight: 1.5 }, children: vendor.cancellationPolicy } },
            ]
          : []),
        // Footer
        {
          type: "div",
          props: {
            style: { display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: 24, borderTop: "1px solid #E4E4E7" },
            children: [
              { type: "span", props: { style: { display: "flex", fontSize: 12, color: "#A1A1AA" }, children: `Confirmed ${new Date().toLocaleDateString("en-NG", { timeZone: "UTC" })}` } },
              { type: "span", props: { style: { display: "flex", fontSize: 12, color: "#A1A1AA" }, children: "Powered by Booktns" } },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: PAGE_WIDTH, height: pageHeight, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: PAGE_WIDTH * 2 } }).render().asPng();

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(png);
  const page = pdfDoc.addPage([PAGE_WIDTH, pageHeight]);
  page.drawImage(pngImage, { x: 0, y: 0, width: PAGE_WIDTH, height: pageHeight });

  return Buffer.from(await pdfDoc.save());
}
