import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeOrder } from "@/lib/serialize";
import { generateOrderConfirmationPdf } from "@/lib/pdf";
import { uploadFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Public, unauthenticated — a guest's only "credential" is the unguessable
// order slug itself, the same trust model as the /order/[slug] page this is
// linked from and as the sibling bookings/by-slug route.
//
// The PDF is generated on the first request rather than at checkout, then
// cached on the order. Checkout can't pre-generate it the way booking
// confirmation does: a booking PDF is produced by a vendor action minutes or
// hours before the customer looks for it, whereas the customer lands on the
// order confirmation page the instant the order row exists — a background
// job would race the page and the download button would be dead on arrival.
// Generating here means the URL is valid the moment the page renders, and
// orders nobody downloads never cost a render.
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;

  const order = await db.order.findUnique({
    where: { slug },
    include: { items: true, paymentMethod: true, vendor: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found", code: "not_found" }, { status: 404 });
  }

  if (order.confirmationPdfUrl) {
    return NextResponse.redirect(order.confirmationPdfUrl);
  }

  try {
    const pdfBuffer = await generateOrderConfirmationPdf(serializeOrder(order), {
      name: order.vendor.name,
      location: order.vendor.location,
      logoUrl: order.vendor.logoUrl,
      slug: order.vendor.slug,
      phone: order.vendor.phone,
      whatsapp: order.vendor.personalWhatsappNumber ?? order.vendor.whatsapp,
      storefrontTheme: order.vendor.storefrontTheme,
      ownerName: order.vendor.ownerName,
      showOwnerName: order.vendor.showOwnerName,
    });

    const confirmationPdfUrl = await uploadFile(`orders/${order.slug}/confirmation.pdf`, pdfBuffer, "application/pdf");
    await db.order.update({ where: { id: order.id }, data: { confirmationPdfUrl } });

    return NextResponse.redirect(confirmationPdfUrl);
  } catch (err) {
    logger.error("generateOrderConfirmationPdf failed", { orderId: order.id, vendorId: order.vendorId, err });
    return NextResponse.json(
      { error: "We couldn't build your receipt just now. Please try again in a moment.", code: "server_error" },
      { status: 500 }
    );
  }
}
