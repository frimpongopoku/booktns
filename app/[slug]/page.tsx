import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice, formatDuration } from "@/lib/data";
import { getStorefrontVendor, getAllActiveVendorSlugs, getStorefrontVendorForPreview, getVendorPublicMeta } from "@/lib/vendors";
import { getSession } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import StorefrontNav from "@/components/storefront/StorefrontNav";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";
import VideoCard from "@/components/storefront/VideoCard";
import HeroCard from "@/components/storefront/HeroCard";
import StorefrontUnavailable from "@/components/storefront/StorefrontUnavailable";
import {
  MapPin,
  Clock,
  Scissors,
  Sparkles,
  Hand,
  Eye,
  Brush,
  Droplet,
  Waves,
  ShoppingBag,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  Star,
} from "lucide-react";
import type { StorefrontDisplayMode, ServiceCategory } from "@/types";

// The home page's "featured" teaser sections respect the vendor's display
// mode; the full /book and /shop pages always show everything regardless.
function selectStorefrontItems<T extends { featured: boolean }>(items: T[], mode: StorefrontDisplayMode): T[] {
  if (mode === "FeaturedOnly") return items.filter((item) => item.featured);
  if (mode === "AllWithFeaturedHighlighted") {
    return [...items].sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return items;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Record<ServiceCategory, ...> rather than Record<string, ...> — TypeScript
// now errors if a category is ever added without an icon here, instead of
// silently falling back (as "Brows" previously did before this fix).
const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  Hair: <Scissors size={15} />,
  Nails: <Hand size={15} />,
  Skin: <Sparkles size={15} />,
  Lashes: <Eye size={15} />,
  Brows: <Eye size={15} />,
  Makeup: <Brush size={15} />,
  Barbering: <Scissors size={15} />,
  Waxing: <Droplet size={15} />,
  Massage: <Waves size={15} />,
  Other: <Sparkles size={15} />,
};

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
      title: meta ? `${meta.name} — Coming soon` : "Shop not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${vendorData.name} — Book Appointments Online`;
  const description =
    vendorData.description ||
    `Book beauty appointments and shop products from ${vendorData.name} in ${vendorData.location}.`;

  return {
    title,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title,
      description,
      url: `/${slug}`,
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

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  let vendorData = await getStorefrontVendor(slug);
  let isPreview = false;

  // Storefront isn't published (or doesn't exist) for anonymous visitors —
  // but a vendor's own staff can still preview it before deciding to publish.
  if (!vendorData) {
    const session = await getSession();
    if (session) {
      const previewData = await getStorefrontVendorForPreview(slug);
      if (previewData && previewData.id === session.vendorId) {
        vendorData = previewData;
        isPreview = true;
      }
    }
  }

  if (!vendorData) {
    const meta = await getVendorPublicMeta(slug);
    // A genuinely nonexistent slug gets a real 404 (correct HTTP semantics
    // for crawlers/tools, via app/[slug]/not-found.tsx). A vendor that
    // exists but hasn't published yet stays 200 — the resource is real,
    // just not fully available — with noindex handled in generateMetadata.
    if (!meta) notFound();
    return <StorefrontUnavailable reason="not-published" vendorName={meta.name} />;
  }

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: vendorData.name,
    description:
      vendorData.description ||
      `Book beauty appointments and shop products from ${vendorData.name} in ${vendorData.location}.`,
    url: `${SITE_URL}/${slug}`,
    telephone: vendorData.phone,
    // `location` is a single free-text field (no separate street/city/country
    // columns) — schema.org allows Text for `address`, so this stays a plain
    // string rather than a fabricated PostalAddress split.
    address: vendorData.location,
    ...(vendorData.logoUrl || vendorData.coverImageUrl
      ? { image: vendorData.logoUrl ?? vendorData.coverImageUrl }
      : {}),
  };

  const displayedServices = selectStorefrontItems(vendorData.services, vendorData.storefrontDisplayMode);
  const displayedProducts = selectStorefrontItems(vendorData.products, vendorData.storefrontDisplayMode);
  const showFeaturedBadge = vendorData.storefrontDisplayMode === "AllWithFeaturedHighlighted";
  const vendorVideos = vendorData.videos;

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />
      <StorefrontNav slug={slug} vendorName={vendorData.name} />

      {isPreview && (
        <div
          className="px-4 md:px-8 py-2.5 flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: "var(--amber-bg)", color: "var(--amber)" }}
        >
          Preview mode — this storefront isn&apos;t published yet.
          <Link href="/dashboard/settings" className="underline">Publish it</Link>
        </div>
      )}

      {/* Mobile header */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        <p className="text-base font-semibold" style={{ color: "var(--tx)", letterSpacing: "-0.02em" }}>
          {vendorData.name}
        </p>
        <Link
          href={`/${slug}/book`}
          className="px-3.5 py-2 rounded-[var(--r)] text-sm font-medium text-white"
          style={{
            background: "var(--ac)",
            boxShadow: "0 1px 3px color-mix(in srgb, var(--ac) 30%, transparent)",
          }}
        >
          Book Now
        </Link>
      </div>

      {/* Hero */}
      <section className="px-4 md:px-8 py-10 md:py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          {/* Left: text */}
          <div>
            {vendorData.logoUrl && (
              <div
                className="anim-fade-up w-14 h-14 rounded-full overflow-hidden mb-5"
                style={{ boxShadow: "var(--shadow-sm)", border: "1px solid var(--bd)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vendorData.logoUrl} alt={`${vendorData.name} logo`} className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className="anim-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-7"
              style={{ background: "var(--green-bg)", color: "var(--green)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
              Open today · {vendorData.hours}
            </div>

            <h1
              className="anim-fade-up anim-d1 text-4xl md:text-5xl font-semibold leading-[1.1] mb-4"
              style={{ color: "var(--tx)", letterSpacing: "-0.03em" }}
            >
              {vendorData.name}
            </h1>
            <p className="anim-fade-up anim-d2 text-base mb-7 leading-relaxed" style={{ color: "var(--tx2)" }}>
              {vendorData.description}
            </p>
            <div className="anim-fade-up anim-d2 flex flex-col gap-2 mb-8">
              <div className="flex items-center gap-2.5">
                <MapPin size={13} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx2)" }}>
                  {vendorData.location}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={13} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx2)" }}>
                  {vendorData.hours}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/${slug}/book`}
                className="px-6 py-2.5 rounded-[var(--r)] text-white font-medium text-sm inline-flex items-center gap-2"
                style={{
                  background: "var(--ac)",
                  boxShadow: "0 1px 3px color-mix(in srgb, var(--ac) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                Book Appointment
                <ArrowRight size={14} />
              </Link>
              <Link
                href={`/${slug}/shop`}
                className="px-6 py-2.5 rounded-[var(--r)] font-medium text-sm inline-flex items-center gap-2"
                style={{
                  background: "var(--bg3)",
                  color: "var(--tx)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <ShoppingBag size={14} />
                Shop
              </Link>
            </div>
          </div>

          {/* Right: hero card */}
          <HeroCard
            name={vendorData.name}
            location={vendorData.location}
            coverImageUrl={vendorData.coverImageUrl}
            heroCardMode={vendorData.heroCardMode}
            heroGalleryUrls={vendorData.heroGalleryUrls}
            heroVideoId={vendorData.heroVideoId}
            videos={vendorData.videos}
          />
        </div>
      </section>

      {/* Services */}
      <section
        id="services"
        className="px-4 md:px-8 py-12"
        style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
              Services
            </h2>
            <Link
              href={`/${slug}/book`}
              className="text-sm font-medium inline-flex items-center gap-1"
              style={{ color: "var(--ac)" }}
            >
              Book now <ArrowRight size={13} />
            </Link>
          </div>
          {displayedServices.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {displayedServices.map((svc) => (
                  <Link
                    key={svc.id}
                    href={`/${slug}/book`}
                    className="relative flex items-center gap-3.5 p-4 rounded-[var(--rl)] transition-all duration-150 hover:translate-y-[-1px]"
                    style={{
                      background: "var(--bg)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                    >
                      {CATEGORY_ICONS[svc.category] ?? <Sparkles size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
                        >
                          {svc.name}
                        </p>
                        {showFeaturedBadge && svc.featured && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                            style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                          >
                            <Star size={9} fill="currentColor" />
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={11} style={{ color: "var(--tx3)" }} />
                        <span className="text-xs" style={{ color: "var(--tx3)" }}>
                          {formatDuration(svc.durationMinutes)}
                        </span>
                      </div>
                    </div>
                    <p
                      className="text-sm font-semibold flex-shrink-0"
                      style={{ color: "var(--tx)" }}
                    >
                      {formatPrice(svc.priceInPesewas)}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="mt-5 text-center">
                <Link
                  href={`/${slug}/book`}
                  className="text-sm font-medium inline-flex items-center gap-1.5"
                  style={{ color: "var(--ac)" }}
                >
                  {displayedServices.length < vendorData.services.length
                    ? `View all ${vendorData.services.length} services`
                    : "Book now"}
                  <ArrowRight size={13} />
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-10" style={{ color: "var(--tx3)" }}>
              {vendorData.services.length > 0
                ? "No featured services yet — check back shortly."
                : "Services coming soon — check back shortly."}
            </p>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="px-4 md:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
              Shop
            </h2>
            <Link
              href={`/${slug}/shop`}
              className="text-sm font-medium inline-flex items-center gap-1"
              style={{ color: "var(--ac)" }}
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/${slug}/shop`}
                  className="relative rounded-[var(--rl)] overflow-hidden transition-all duration-150 hover:translate-y-[-2px]"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  {showFeaturedBadge && p.featured && (
                    <span
                      className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: "rgba(0,0,0,0.6)", color: "white" }}
                    >
                      <Star size={9} fill="currentColor" />
                      Featured
                    </span>
                  )}
                  <div
                    className="aspect-square flex items-center justify-center"
                    style={{ background: "var(--bg3)" }}
                  >
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <ShoppingBag size={26} style={{ color: "var(--tx3)" }} />
                    )}
                  </div>
                  <div className="p-3" style={{ background: "var(--bg2)" }}>
                    <p
                      className="text-xs font-semibold mb-1 truncate"
                      style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
                    >
                      {p.name}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--ac)" }}>
                      {formatPrice(p.priceInPesewas)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-10" style={{ color: "var(--tx3)" }}>
              {vendorData.products.length > 0
                ? "No featured products yet — check back shortly."
                : "Products coming soon — check back shortly."}
            </p>
          )}
        </div>
      </section>

      {/* Videos — only if vendor has them */}
      {vendorVideos.length > 0 && (
        <section
          className="px-4 md:px-8 py-12"
          style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
                  See us in action
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
                  Watch how we work
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {vendorVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why book with us */}
      <section
        className="px-4 md:px-8 py-12"
        style={{ borderTop: "1px solid var(--bds)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold mb-8" style={{ color: "var(--tx)" }}>
            Why book with us
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: <CheckCircle size={17} />,
                title: "Instant confirmation",
                desc: "Get a WhatsApp confirmation within minutes of booking.",
              },
              {
                icon: <MessageCircle size={17} />,
                title: "Easy rescheduling",
                desc: "Need to move an appointment? Just message us on WhatsApp.",
              },
              {
                icon: <Clock size={17} />,
                title: "On time, every time",
                desc: "We respect your time. Punctuality is our promise.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div
                  className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold mb-1.5"
                    style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--tx2)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book CTA banner */}
      <section className="px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-[var(--rl)] px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, var(--brand-accent-light) 0%, var(--brand-accent-light-2) 100%)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 90% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <p
                className="text-xl font-semibold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                Ready to book?
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                Pick your service and book in under 2 minutes.
              </p>
            </div>
            <Link
              href={`/${slug}/book`}
              className="relative flex-shrink-0 px-6 py-3 rounded-[var(--r)] font-semibold text-sm inline-flex items-center gap-2"
              style={{
                background: "white",
                color: "var(--brand-accent-light)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              Book appointment
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--bd)" }}
      >
        <p className="text-xs" style={{ color: "var(--tx3)" }}>
          © 2025 {vendorData.name}
        </p>
        <Link href="/" className="text-xs" style={{ color: "var(--tx3)" }}>
          Powered by{" "}
          <span className="font-semibold" style={{ color: "var(--ac)" }}>
            booktns
          </span>
        </Link>
      </footer>

      <MobileStorefrontNav slug={slug} />
    </div>
  );
}
