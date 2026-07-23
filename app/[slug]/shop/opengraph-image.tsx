import { getVendorBySlug } from "@/lib/data";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const vendor = getVendorBySlug(slug);

  return renderBrandCard({
    title: `Shop — ${vendor?.name ?? "Booktns"}`,
    subtitle: "Hair, skin, and nail products, shipped from the source.",
  });
}
