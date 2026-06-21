import BookingFlow from "@/components/storefront/BookingFlow";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: PageProps) {
  const { slug } = await params;
  return <BookingFlow slug={slug} />;
}
