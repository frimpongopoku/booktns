import { getStorefrontVendor } from "@/lib/vendors";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string; productSlug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug, productSlug } = await params;
  const vendor = await getStorefrontVendor(slug);
  const product = vendor?.products.find((p) => p.slug === productSlug);

  // Plain "GHS" here rather than lib/data.ts's formatPrice — Satori's default
  // font has no glyph for "₵" and renders it as a missing-character box.
  const subtitle = product
    ? `GHS ${(product.priceInPesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : undefined;

  return renderBrandCard({
    title: product?.name ?? vendor?.name ?? "Booktns",
    subtitle,
    theme: vendor?.storefrontTheme,
  });
}
