import { getStorefrontVendor, getStorefrontVendorForPreview } from "@/lib/vendors";
import { getSession } from "@/lib/auth";
import type { StorefrontTheme } from "@/types";

interface LayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

// Resolves the vendor's storefront theme for the [data-storefront-theme] CSS
// scope (see app/globals.css) — mirrors page.tsx's own published/preview
// fallback so a vendor previewing an unpublished storefront still sees their
// chosen theme, without duplicating page.tsx's actual not-found logic here.
// getStorefrontVendor is cache()-wrapped in lib/vendors.ts, so calling it
// again here costs nothing extra — every storefront page already calls it.
async function resolveStorefrontTheme(slug: string): Promise<StorefrontTheme> {
  const vendor = await getStorefrontVendor(slug);
  if (vendor) return vendor.storefrontTheme;

  const session = await getSession();
  if (session) {
    const preview = await getStorefrontVendorForPreview(slug);
    if (preview && preview.id === session.vendorId) return preview.storefrontTheme;
  }

  return "Red";
}

export default async function StorefrontLayout({ params, children }: LayoutProps) {
  const { slug } = await params;
  const theme = await resolveStorefrontTheme(slug);

  return (
    <div data-storefront-theme={theme} className="contents">
      {children}
    </div>
  );
}
