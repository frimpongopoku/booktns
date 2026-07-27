import { getStorefrontVendor } from "@/lib/vendors";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const vendor = await getStorefrontVendor(slug);

  return renderBrandCard({
    title: vendor?.name ?? "Booktns",
    subtitle: vendor?.location ?? "Book appointments online",
    theme: vendor?.storefrontTheme,
  });
}
