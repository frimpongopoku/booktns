import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingFlow from "@/components/storefront/BookingFlow";
import { getStorefrontVendor } from "@/lib/vendors";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = await getStorefrontVendor(slug);
  const title = vendorData ? `Book — ${vendorData.name}` : "Book an Appointment";

  return {
    title,
    alternates: { canonical: `/${slug}/book` },
    robots: { index: false, follow: true },
  };
}

export default async function BookPage({ params }: PageProps) {
  const { slug } = await params;
  const vendorData = await getStorefrontVendor(slug);
  if (!vendorData) notFound();

  return (
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
    />
  );
}
