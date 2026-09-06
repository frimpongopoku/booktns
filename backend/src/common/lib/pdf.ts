import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument, PDFName, PDFString, type PDFPage } from "pdf-lib";
import type { Booking, Order } from "../../types";
import { formatPrice } from "../lib/data";
import { fetchImageAsPngDataUri } from "../lib/image";
import { loadInterFonts } from "../lib/fonts";
import { STOREFRONT_THEMES, type StorefrontTheme } from "../lib/theme";
import { SITE_URL } from "../lib/site";

// Only what the PDF layouts actually render — avoids requiring a full
// Vendor row just to generate a document. Everything below `location` is
// branding/contact detail: optional so a caller with a partial vendor row
// still produces a valid document, just a plainer one.
interface VendorPdfInfo {
  name: string;
  location: string;
  logoUrl?: string | null;
  cancellationPolicy?: string | null;
  slug?: string;
  phone?: string;
  whatsapp?: string;
  storefrontTheme?: StorefrontTheme;
  ownerName?: string | null;
  showOwnerName?: boolean;
}

// The vendor's chosen storefront colour, reused as the document accent so a
// printed receipt reads as theirs rather than as generic platform paperwork.
function accentColor(vendor: VendorPdfInfo): string {
  return STOREFRONT_THEMES[vendor.storefrontTheme ?? "Red"].light;
}

const PAGE_WIDTH = 794; // A4 @ 96dpi
const ROW_HEIGHT = 34;
const BASE_HEIGHT = 480;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
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

// Section headings carry the vendor's storefront colour — the cheapest,
// least intrusive way to make the document read as theirs on every page
// section rather than only in the letterhead.
function sectionLabel(text: string, color: string) {
  return {
    type: "div",
    props: {
      style: { display: "flex", fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 30 },
      children: text,
    },
  };
}

// The one figure the reader is looking for — set apart from the line items
// above it by a rule, weight, and the vendor's colour.
function totalRow(label: string, value: string, color: string) {
  return {
    type: "div",
    props: {
      style: { display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 4, borderTop: "1px solid #E4E4E7" },
      children: [
        { type: "span", props: { style: { display: "flex", fontSize: 14, fontWeight: 700, color: "#18181B" }, children: label } },
        { type: "span", props: { style: { display: "flex", fontSize: 18, fontWeight: 700, color }, children: value } },
      ],
    },
  };
}

// Vendor letterhead: logo and business name on the left, the vendor's own
// contact details on the right, over a rule in the vendor's storefront
// colour. Shared by both documents so a vendor's paperwork looks like one
// set, and so the branding is defined once rather than per-document.
function documentHeader(vendor: VendorPdfInfo, logoDataUri: string | null) {
  const storefrontUrl = vendor.slug ? `${SITE_URL.replace(/^https?:\/\//, "")}/${vendor.slug}` : null;
  const contactLines = [vendor.phone, vendor.whatsapp && vendor.whatsapp !== vendor.phone ? `WhatsApp ${vendor.whatsapp}` : null, storefrontUrl].filter(
    (line): line is string => Boolean(line)
  );

  return {
    type: "div",
    props: {
      style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 24, borderBottom: `3px solid ${accentColor(vendor)}` },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center" },
            children: [
              ...(logoDataUri
                ? [{ type: "img", props: { src: logoDataUri, width: 56, height: 56, style: { borderRadius: 10, marginRight: 16 } } }]
                : []),
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column" },
                  children: [
                    { type: "span", props: { style: { display: "flex", fontSize: 24, fontWeight: 700, color: "#18181B" }, children: vendor.name } },
                    { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#71717A", marginTop: 2 }, children: vendor.location } },
                  ],
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
            children: contactLines.map((line) => ({
              type: "span",
              props: { style: { display: "flex", fontSize: 12, color: "#71717A", marginBottom: 3 }, children: line },
            })),
          },
        },
      ],
    },
  };
}

// The owner credit line only appears on paperwork if the vendor also chose
// to show it publicly (showOwnerName) — the PDF is a document the customer
// keeps, so it must not leak a detail they kept off the storefront.
//
// The growth line below it is deliberate: whoever's holding this document
// isn't necessarily the vendor's customer forever — they might run their own
// beauty business and never have heard of Booktns before this receipt. The
// URL is printed as real, readable text (not just a link) because this is a
// flattened image inside the PDF — see addFooterLinkAnnotation for the
// actual clickable overlay, which a printed copy obviously can't carry.
function documentFooter(leftText: string, vendor: VendorPdfInfo) {
  const ownedBy = vendor.showOwnerName && vendor.ownerName ? `${vendor.name} is owned by ${vendor.ownerName}` : null;
  const bareSiteUrl = SITE_URL.replace(/^https?:\/\//, "");

  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", marginTop: "auto", paddingTop: 24, borderTop: "1px solid #E4E4E7" },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", justifyContent: "space-between" },
            children: [
              { type: "span", props: { style: { display: "flex", fontSize: 12, color: "#A1A1AA" }, children: leftText } },
              { type: "span", props: { style: { display: "flex", fontSize: 12, color: "#A1A1AA" }, children: "Powered by Booktns" } },
            ],
          },
        },
        ...(ownedBy
          ? [{ type: "span", props: { style: { display: "flex", fontSize: 12, color: "#A1A1AA", marginTop: 6 }, children: ownedBy } }]
          : []),
        {
          type: "span",
          props: {
            style: { display: "flex", fontSize: 11, color: "#A1A1AA", marginTop: 10 },
            children: `Run a beauty business too? Set up your own free booking page at ${bareSiteUrl}`,
          },
        },
      ],
    },
  };
}

// The footer above is one flattened image by the time it reaches the PDF —
// this overlays a real clickable Link annotation across the bottom band
// where that text renders, so a reader in an actual PDF viewer (Preview,
// Acrobat, Chrome) can tap straight through instead of having to retype the
// URL. pdf-lib has no high-level "add a link" helper, so this builds the
// annotation dictionary directly — the documented approach for this library.
function addFooterLinkAnnotation(page: PDFPage, pageWidth: number, url: string): void {
  const linkAnnotation = page.doc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [0, 0, pageWidth, 90],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  const linkRef = page.doc.context.register(linkAnnotation);
  const existingAnnots = page.node.Annots();
  if (existingAnnots) {
    existingAnnots.push(linkRef);
  } else {
    page.node.set(PDFName.of("Annots"), page.doc.context.obj([linkRef]));
  }
}

// Renders the Confirmed Booking PDF — vendor logo, confirmation status,
// customer + appointment + services + products, deposit reference code,
// payment details, and the vendor's cancellation policy. Generated once,
// only on the pending -> confirmed transition (see app/api/bookings/[id]).
export async function generateConfirmedBookingPdf(booking: Booking, vendor: VendorPdfInfo): Promise<Buffer> {
  const fonts = await loadInterFonts();
  const logoDataUri = vendor.logoUrl ? await fetchImageAsPngDataUri(vendor.logoUrl) : null;
  const accent = accentColor(vendor);

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
        documentHeader(vendor, logoDataUri),
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
        sectionLabel("Services", accent),
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              ...booking.services.map((s) => row(s.name, formatPrice(s.priceAtBooking))),
              totalRow("Total", formatPrice(servicesTotal), accent),
            ],
          },
        },
        // Products
        ...(booking.products.length > 0
          ? [
              sectionLabel("Products flagged", accent),
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
              sectionLabel("Deposit", accent),
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
              sectionLabel("Cancellation policy", accent),
              { type: "div", props: { style: { display: "flex", fontSize: 13, color: "#52525B", lineHeight: 1.5 }, children: vendor.cancellationPolicy } },
            ]
          : []),
        documentFooter(`Confirmed ${new Date().toLocaleDateString("en-GH", { timeZone: "UTC" })}`, vendor),
      ],
    },
  };

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: PAGE_WIDTH, height: pageHeight, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: PAGE_WIDTH * 2 } }).render().asPng();

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(png);
  const page = pdfDoc.addPage([PAGE_WIDTH, pageHeight]);
  page.drawImage(pngImage, { x: 0, y: 0, width: PAGE_WIDTH, height: pageHeight });
  addFooterLinkAnnotation(page, PAGE_WIDTH, SITE_URL);

  return Buffer.from(await pdfDoc.save());
}

// Renders the Order Confirmation PDF — vendor logo, order reference,
// customer details, the itemised cart with the prices actually charged
// (priceSnapshot, never the product's current price), delivery preference,
// and the payment details the customer needs to settle out-of-band.
// Generated lazily on the first download rather than at checkout — see
// app/api/orders/by-slug/[slug]/pdf/route.ts for why.
export async function generateOrderConfirmationPdf(order: Order, vendor: VendorPdfInfo): Promise<Buffer> {
  const fonts = await loadInterFonts();
  const logoDataUri = vendor.logoUrl ? await fetchImageAsPngDataUri(vendor.logoUrl) : null;
  const accent = accentColor(vendor);

  const rowCount = order.items.length + (order.paymentMethod ? 4 : 1) + (order.notes ? 2 : 0);
  const pageHeight = BASE_HEIGHT + rowCount * ROW_HEIGHT;

  const itemsTotal = order.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

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
        documentHeader(vendor, logoDataUri),
        // Status + reference
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
                  children: "Order received",
                },
              },
              { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#A1A1AA", marginLeft: 12 }, children: order.ref } },
            ],
          },
        },
        // Customer + fulfilment
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
                    { type: "span", props: { style: { display: "flex", fontSize: 16, fontWeight: 700, color: "#18181B" }, children: order.customerName } },
                    { type: "span", props: { style: { display: "flex", fontSize: 13, color: "#71717A", marginTop: 2 }, children: order.customerPhone } },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: { display: "flex", fontSize: 14, fontWeight: 500, color: "#18181B" },
                        children: order.deliveryPreference === "Delivery" ? "Delivery" : "Pickup",
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: { display: "flex", fontSize: 13, color: "#71717A", marginTop: 2 },
                        children: `Placed ${formatDateTime(order.createdAt)}`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Items
        sectionLabel("Items", accent),
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              ...order.items.map((item) =>
                row(item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name, formatPrice(item.priceSnapshot * item.quantity))
              ),
              totalRow("Total", formatPrice(itemsTotal), accent),
            ],
          },
        },
        // Payment
        sectionLabel("Payment", accent),
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              totalRow("Amount due", formatPrice(order.totalPesewas), accent),
              ...(order.paymentMethod
                ? [
                    row("Method", order.paymentMethod.label),
                    row("Account name", order.paymentMethod.accountName),
                    ...(order.paymentMethod.accountNumber ? [row("Account number", order.paymentMethod.accountNumber)] : []),
                  ]
                : [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", fontSize: 13, color: "#52525B", lineHeight: 1.5, marginTop: 4 },
                        children: `Payment is arranged directly with ${vendor.name}${vendor.phone ? ` on ${vendor.phone}` : ""}.`,
                      },
                    },
                  ]),
            ],
          },
        },
        // Customer notes
        ...(order.notes
          ? [
              sectionLabel("Notes", accent),
              { type: "div", props: { style: { display: "flex", fontSize: 13, color: "#52525B", lineHeight: 1.5 }, children: order.notes } },
            ]
          : []),
        documentFooter(`Order ${order.ref}`, vendor),
      ],
    },
  };

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: PAGE_WIDTH, height: pageHeight, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: PAGE_WIDTH * 2 } }).render().asPng();

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(png);
  const page = pdfDoc.addPage([PAGE_WIDTH, pageHeight]);
  page.drawImage(pngImage, { x: 0, y: 0, width: PAGE_WIDTH, height: pageHeight });
  addFooterLinkAnnotation(page, PAGE_WIDTH, SITE_URL);

  return Buffer.from(await pdfDoc.save());
}
