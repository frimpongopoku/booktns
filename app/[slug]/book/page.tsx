import type { Metadata } from "next";
import BookingFlow from "@/components/storefront/BookingFlow";
import { getVendorBySlug } from "@/lib/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = getVendorBySlug(slug);
  const title = vendorData ? `Book — ${vendorData.name}` : "Book an Appointment";

  return {
    title,
    alternates: { canonical: `/${slug}/book` },
    robots: { index: false, follow: true },
  };
}

export default async function BookPage({ params }: PageProps) {
  const { slug } = await params;
  return <BookingFlow slug={slug} />;
}
