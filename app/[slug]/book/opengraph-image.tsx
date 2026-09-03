import { formatDuration } from "@/lib/data";
import { getStorefrontVendor } from "@/lib/vendors";
import { ogImageContentType, ogImageSize, renderBrandCard } from "@/lib/og-image";
import { vendorOgFacts, vendorOgBranding } from "@/lib/storefront-og";

export const size = ogImageSize;
export const contentType = ogImageContentType;

interface ImageProps {
  params: Promise<{ slug: string }>;
}

// The booking page is the link vendors share most, so its card has to carry
// the shop's branding and enough detail to be worth clicking.
//
// Note it cannot vary by ?service= — Next's opengraph-image convention gives
// the route params only, never the query string. A per-service card would
// need its own dynamic image route; the page's OG *title and description* do
// already reflect the named service (see page.tsx), which is what the
// preview headline shows.
export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const vendor = await getStorefrontVendor(slug);

  if (!vendor) {
    return renderBrandCard({ title: "Book an appointment", subtitle: "Booktns" });
  }

  const { logoDataUri, coverDataUri } = await vendorOgBranding(vendor);

  const facts = vendorOgFacts(vendor);
  const quickest = vendor.services.length > 0 ? Math.min(...vendor.services.map((s) => s.durationMinutes)) : null;
  if (quickest !== null && facts.length < 4) facts.push(`From ${formatDuration(quickest)}`);

  return renderBrandCard({
    title: `Book with ${vendor.name}`,
    subtitle: `${vendor.location} · pick a time, no account needed`,
    theme: vendor.storefrontTheme,
    logoDataUri,
    coverDataUri,
    facts,
  });
}
