import { getVendorIconLogoUrl } from "@/lib/vendors";
import { fetchImageAsPngDataUri } from "@/lib/image";
import { renderVendorIconMark } from "@/lib/og-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

interface IconProps {
  params: Promise<{ slug: string }>;
}

// Per-vendor favicon. This file shadows app/icon.tsx for /[slug] and
// everything under it (/book, /shop, /pay), so a vendor's storefront shows
// their own logo in the browser tab once they upload one in Settings —
// falling back to the Booktns mark when they haven't.
export default async function Icon({ params }: IconProps) {
  const { slug } = await params;
  const logoUrl = await getVendorIconLogoUrl(slug);
  const logoDataUri = logoUrl ? await fetchImageAsPngDataUri(logoUrl, 64) : null;
  return renderVendorIconMark({ size: 32, logoDataUri });
}
