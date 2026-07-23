import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorBySlug, vendor, products } from "@/lib/data";
import ShopClient from "@/components/storefront/ShopClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [{ slug: vendor.slug }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = getVendorBySlug(slug);
  if (!vendorData) return {};

  const title = `Shop — ${vendorData.name}`;
  const description = `Shop hair, skin, and nail products from ${vendorData.name}. Order online, pick up or get it delivered.`;

  return {
    title,
    description,
    alternates: { canonical: `/${slug}/shop` },
    openGraph: {
      title,
      description,
      url: `/${slug}/shop`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params;
  const vendorData = getVendorBySlug(slug);
  if (!vendorData) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        description: product.description,
        url: `${appUrl}/${slug}/shop`,
        offers: {
          "@type": "Offer",
          price: (product.priceInPesewas / 100).toFixed(2),
          priceCurrency: "GHS",
          availability:
            product.stockCount > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ShopClient slug={slug} vendorName={vendorData.name} products={products} />
    </>
  );
}
