import { getVendorIconLogoUrl } from "@/lib/vendors";
import { fetchImageAsPngDataUri } from "@/lib/image";
import { renderVendorIconMark } from "@/lib/og-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

interface IconProps {
  params: Promise<{ slug: string }>;
}

// The home-screen icon when a customer saves a vendor's storefront to their
// phone — same source and fallback as icon.tsx, just the size iOS asks for.
export default async function AppleIcon({ params }: IconProps) {
  const { slug } = await params;
  const logoUrl = await getVendorIconLogoUrl(slug);
  const logoDataUri = logoUrl ? await fetchImageAsPngDataUri(logoUrl, 360) : null;
  return renderVendorIconMark({ size: 180, logoDataUri });
}
