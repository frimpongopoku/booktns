import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;

export default function Image() {
  return renderBrandCard({
    title: "Beauty booking, done right.",
    subtitle: "Bookings, orders, and your storefront — all in one place.",
  });
}
