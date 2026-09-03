import { getStorefrontVendor } from "@/lib/vendors";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";
import { vendorOgFacts, vendorOgBranding } from "@/lib/storefront-og";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const vendor = await getStorefrontVendor(slug);

  if (!vendor) {
    return renderBrandCard({ title: "Booktns", subtitle: "Book appointments online" });
  }

  const { logoDataUri, coverDataUri } = await vendorOgBranding(vendor);

  return renderBrandCard({
    title: vendor.name,
    subtitle: vendor.location,
    theme: vendor.storefrontTheme,
    logoDataUri,
    coverDataUri,
    facts: vendorOgFacts(vendor),
  });
}
