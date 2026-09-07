import type { Metadata } from "next";
import StorefrontUnavailable from "@/components/storefront/StorefrontUnavailable";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    reason?: string;
    vendorName?: string;
    slug?: string;
  }>;
}

const KNOWN_REASONS = new Set(["not-found", "not-published", "suspended", "domain-not-verified"]);

// Rewrite target only — proxy.ts sends a visitor here when their custom
// domain resolves to something other than a live, ready storefront (see
// resolveCustomDomain in lib/vendors.ts). Never linked to directly; the
// visitor's own domain stays in the address bar the whole time, this page
// just supplies the content for it.
export default async function CustomDomainUnavailablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reason = KNOWN_REASONS.has(params.reason ?? "") ? (params.reason as Parameters<typeof StorefrontUnavailable>[0]["reason"]) : "not-found";
  const platformUrl = params.slug ? `${SITE_URL}/${params.slug}` : undefined;

  return <StorefrontUnavailable reason={reason} vendorName={params.vendorName} platformUrl={platformUrl} />;
}
