import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefrontVendor, getAllActiveVendorSlugs, getVendorPublicMeta } from "@/lib/vendors";
import { SITE_URL } from "@/lib/site";
import ShopClient from "@/components/storefront/ShopClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllActiveVendorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = await getStorefrontVendor(slug);
  if (!vendorData) {
    const meta = await getVendorPublicMeta(slug);
    return {
      title: meta ? `Shop — ${meta.name}` : "Shop not found",
      robots: { index: false, follow: false },
    };
  }

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
  const vendorData = await getStorefrontVendor(slug);
  if (!vendorData) notFound();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: vendorData.products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.images.map((img) => img.url),
        url: `${SITE_URL}/${slug}/shop/${product.slug}`,
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
      <ShopClient slug={slug} vendorName={vendorData.name} products={vendorData.products} paymentMethods={vendorData.paymentMethods} />
    </>
  );
}
