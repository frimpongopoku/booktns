import { formatPrice } from "@/lib/data";
import { getStorefrontVendor } from "@/lib/vendors";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";
import { vendorOgBranding } from "@/lib/storefront-og";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const vendor = await getStorefrontVendor(slug);

  if (!vendor) {
    return renderBrandCard({ title: "Shop", subtitle: "Booktns" });
  }

  const { logoDataUri, coverDataUri } = await vendorOgBranding(vendor);

  // Product facts, not the storefront's service facts — this card is for the
  // shop specifically, so it should describe the catalogue.
  const facts: string[] = [];
  if (vendor.products.length > 0) {
    facts.push(`${vendor.products.length} product${vendor.products.length === 1 ? "" : "s"}`);
    facts.push(`From ${formatPrice(Math.min(...vendor.products.map((p) => p.priceInPesewas)))}`);
  }
  if (vendor.products.some((p) => p.stockCount > 0)) facts.push("In stock now");

  return renderBrandCard({
    title: `Shop ${vendor.name}`,
    subtitle: vendor.location,
    theme: vendor.storefrontTheme,
    logoDataUri,
    coverDataUri,
    facts,
  });
}
