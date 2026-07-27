import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefrontVendor } from "@/lib/vendors";
import { formatPrice } from "@/lib/data";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";
import ProductPageClient from "@/components/storefront/ProductPageClient";
import { ShoppingCart } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const vendorData = await getStorefrontVendor(slug);
  const product = vendorData?.products.find((p) => p.slug === productSlug);
  if (!vendorData || !product) return {};

  const title = `${product.name} — ${vendorData.name}`;
  const description =
    product.description || `${product.name}, ${formatPrice(product.priceInPesewas)} — shop at ${vendorData.name}.`;
  const image = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/${slug}/shop/${productSlug}` },
    openGraph: {
      title,
      description,
      url: `/${slug}/shop/${productSlug}`,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug, productSlug } = await params;
  const vendorData = await getStorefrontVendor(slug);
  if (!vendorData) notFound();

  const product = vendorData.products.find((p) => p.slug === productSlug);
  if (!product) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((img) => img.url),
    url: `${appUrl}/${slug}/shop/${productSlug}`,
    offers: {
      "@type": "Offer",
      price: (product.priceInPesewas / 100).toFixed(2),
      priceCurrency: "GHS",
      availability:
        product.stockCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 sticky top-0 z-30"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <Link
          href={`/${slug}`}
          className="font-display text-lg font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          {vendorData.name}
        </Link>
        <Link
          href={`/${slug}/shop`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--r)] text-sm font-medium"
          style={{ background: "var(--bg2)", color: "var(--tx)" }}
        >
          <ShoppingCart size={16} />
          Shop
        </Link>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
        <nav className="text-xs mb-6" style={{ color: "var(--tx3)" }}>
          <Link href={`/${slug}/shop`} className="hover:underline">Shop</Link>
          <span className="mx-1.5">/</span>
          <span style={{ color: "var(--tx2)" }}>{product.name}</span>
        </nav>

        <ProductPageClient product={product} vendorSlug={slug} />
      </div>

      <MobileStorefrontNav slug={slug} />
    </div>
  );
}
