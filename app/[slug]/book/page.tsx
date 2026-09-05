import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingFlow from "@/components/storefront/BookingFlow";
import { getStorefrontVendor } from "@/lib/vendors";
import { isRequestFromCustomDomain } from "@/lib/request-context";
import TrackView from "@/components/storefront/TrackView";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { formatPrice, formatDuration } from "@/lib/data";
import type { Service } from "@/types";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string | string[] }>;
}

// A shared booking link may name one or more services to preselect
// (/{slug}/book?service=<id>&service=<id>). Ids are always resolved against
// this vendor's own active services, so an id belonging to another vendor —
// or to a service since deactivated — is ignored rather than trusted.
function resolveRequestedServices(services: Service[], requested?: string | string[]): Service[] {
  if (!requested) return [];
  const ids = new Set(Array.isArray(requested) ? requested : [requested]);
  return services.filter((service) => ids.has(service.id));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = await getStorefrontVendor(slug);

  if (!vendorData) {
    return {
      title: "Book an Appointment",
      alternates: { canonical: `/${slug}/book` },
      robots: { index: false, follow: true },
    };
  }

  const preselected = resolveRequestedServices(vendorData.services, (await searchParams).service);

  // A link to one specific service should unfurl as that service, since
  // that's what the person clicking it was actually offered.
  const title =
    preselected.length === 1
      ? `Book ${preselected[0].name} — ${vendorData.name}`
      : `Book an appointment — ${vendorData.name}`;

  const description =
    preselected.length === 1
      ? `${formatPrice(preselected[0].priceInPesewas)} · ${formatDuration(preselected[0].durationMinutes)}. Pick a time with ${vendorData.name} in ${vendorData.location}.`
      : `Choose a service, pick a time, and book with ${vendorData.name} in ${vendorData.location}. No account needed.`;

  return {
    title,
    description,
    alternates: { canonical: `/${slug}/book` },
    // Kept out of search results (thin, transactional) but deliberately
    // still crawlable — and noindex has no bearing on link unfurling, which
    // reads the OG tags below. This page is the one vendors share most.
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: `/${slug}/book`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const isCustomDomain = await isRequestFromCustomDomain();
  const vendorData = await getStorefrontVendor(slug);
  if (!vendorData) notFound();

  const initialServices = resolveRequestedServices(vendorData.services, (await searchParams).service);

  return (
    <>
      <TrackView
        event={ANALYTICS_EVENTS.bookingPageViewed}
        properties={{
          service_count: vendorData.services.length,
          // Whether they arrived via a shared per-service link, which is
          // the thing worth knowing about how vendors share their calendar.
          deep_linked: initialServices.length > 0,
          deep_linked_service_count: initialServices.length,
        }}
      />
      <BookingFlow
        slug={slug}
        vendorName={vendorData.name}
        vendorLogoUrl={vendorData.logoUrl}
        services={vendorData.services}
        products={vendorData.products}
        staff={vendorData.staff}
        depositSetting={vendorData.depositSetting}
        depositValue={vendorData.depositValue}
        cancellationPolicy={vendorData.cancellationPolicy}
        paymentMethods={vendorData.paymentMethods}
        isCustomDomain={isCustomDomain}
        initialServices={initialServices}
        ownerName={vendorData.ownerName}
        hasOwnerPhone={Boolean(vendorData.ownerPhone)}
        hasOwnerEmail={Boolean(vendorData.ownerEmail)}
        verified={vendorData.verificationStatus === "VERIFIED"}
      />
    </>
  );
}
