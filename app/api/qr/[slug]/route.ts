import { NextResponse } from "next/server";
import { getStorefrontVendor } from "@/lib/vendors";
import { generateStorefrontQrPng, generateStorefrontQrPdf, generateBareQrPng } from "@/lib/qr";
import { SITE_URL } from "@/lib/site";
import { logger } from "@/lib/logger";

type Format = "png" | "pdf" | "bare";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// Public on purpose. The code encodes a storefront URL that is already
// public, so there is nothing here to protect — and a public URL is what
// makes the card shareable as a link rather than only as a file someone
// downloaded.
//
// Generation is a Satori render plus a rasterize, which is expensive enough
// that it must not run per request: the response is cached hard, and a card
// only changes when the vendor changes their name, logo or theme.
export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const vendor = await getStorefrontVendor(slug);

  // Unpublished and suspended shops resolve to null, so their QR can't be
  // generated either — a code pointing at a 404 is worse than none.
  if (!vendor) {
    return NextResponse.json({ error: "Shop not found", code: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "png") as Format;
  const download = url.searchParams.get("download") === "1";

  // The code points at /book rather than the storefront root: someone
  // scanning a sticker on a product is trying to make an appointment, not
  // browse. One fewer tap.
  const target = `${SITE_URL}/${vendor.slug}/book`;
  const displayUrl = `${SITE_URL.replace(/^https?:\/\//, "")}/${vendor.slug}`;

  // A filename the vendor can find again in their downloads folder.
  const safeName = vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  try {
    const { body, type, ext } =
      format === "pdf"
        ? { body: await generateStorefrontQrPdf(vendor, target, displayUrl), type: "application/pdf", ext: "pdf" }
        : format === "bare"
          ? { body: await generateBareQrPng(target), type: "image/png", ext: "png" }
          : { body: await generateStorefrontQrPng(vendor, target, displayUrl), type: "image/png", ext: "png" };

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        // Long cache: the artwork is a pure function of the vendor's name,
        // logo, theme and slug. stale-while-revalidate keeps it instant
        // after a change while the new one renders.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        // inline by default so the URL previews in a chat or a browser tab;
        // ?download=1 for the button in Settings.
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}-booktns-qr.${ext}"`,
      },
    });
  } catch (err) {
    logger.error("QR generation failed", { slug, format, err });
    return NextResponse.json(
      { error: "Couldn't generate that QR code. Please try again.", code: "qr_failed" },
      { status: 500 },
    );
  }
}
