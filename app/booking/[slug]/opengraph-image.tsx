import { getBookingBySlug } from "@/lib/bookings";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const booking = await getBookingBySlug(slug);

  if (!booking) {
    return renderBrandCard({ title: "Booktns", subtitle: "Booking not found" });
  }

  const servicesLabel = booking.services.map((s) => s.name).join(" + ");

  return renderBrandCard({
    title: booking.vendor.name,
    subtitle: servicesLabel,
    theme: booking.vendor.storefrontTheme,
  });
}
