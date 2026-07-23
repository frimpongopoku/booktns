import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVendorBySlug,
  vendor,
  services,
  products,
  videos,
  formatPrice,
  formatDuration,
  formatVideoDuration,
} from "@/lib/data";
import StorefrontNav from "@/components/storefront/StorefrontNav";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";
import {
  MapPin,
  Clock,
  Scissors,
  Sparkles,
  Hand,
  Eye,
  ShoppingBag,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  Play,
} from "lucide-react";
import type { VendorVideo } from "@/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Hair: <Scissors size={15} />,
  Nails: <Hand size={15} />,
  Skin: <Sparkles size={15} />,
  Lashes: <Eye size={15} />,
  Other: <Sparkles size={15} />,
};

function VideoCard({ video }: { video: VendorVideo }) {
  return (
    <div
      className="group rounded-[var(--rl)] overflow-hidden cursor-pointer transition-all duration-200"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Thumbnail */}
      <div
        className="relative"
        style={{
          aspectRatio: "16/9",
          background: `linear-gradient(135deg, ${video.gradientFrom} 0%, ${video.gradientTo} 100%)`,
        }}
      >
        {/* Subtle overlay pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)",
          }}
        />
        {/* Darken on hover */}
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-200" />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            style={{
              background: "rgba(255,255,255,0.92)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            }}
          >
            <Play
              size={18}
              className="ml-0.5"
              style={{ color: video.gradientFrom }}
              fill={video.gradientFrom}
            />
          </div>
        </div>
        {/* Duration badge */}
        <div
          className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-xs font-semibold"
          style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
        >
          {formatVideoDuration(video.durationSeconds)}
        </div>
      </div>
      {/* Info */}
      <div className="p-3.5" style={{ background: "var(--bg2)" }}>
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
        >
          {video.title}
        </p>
        {video.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--tx3)" }}>
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return [{ slug: vendor.slug }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = getVendorBySlug(slug);
  if (!vendorData) return {};

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
  const vendorData = getVendorBySlug(slug);

  if (!vendorData) notFound();

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: vendorData.name,
    description: vendorData.description,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${slug}`,
    telephone: vendorData.phone,
    address: vendorData.location,
  };

  const featuredServices = services.slice(0, 4);
  const featuredProducts = products.slice(0, 4);
  const vendorVideos = videos.filter((v) => v.vendorId === vendorData.id);

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />
      <StorefrontNav slug={slug} vendorName={vendorData.name} />

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
            boxShadow: "0 1px 3px rgba(192,40,58,0.30)",
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
                  boxShadow: "0 1px 3px rgba(192,40,58,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
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

          {/* Right: cover card */}
          <div
            className="hidden md:flex relative rounded-[var(--rl)] overflow-hidden"
            style={{ aspectRatio: "4/3", boxShadow: "var(--shadow-lg)" }}
          >
            {/* Rich gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(145deg, #C0283A 0%, #7A1524 45%, #09090B 100%)",
              }}
            />
            {/* Ambient light shapes */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 80%, rgba(240,136,152,0.20) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.06) 0%, transparent 40%)",
              }}
            />
            {/* Decorative circle */}
            <div
              className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full"
              style={{ background: "rgba(192,40,58,0.18)" }}
            />
            {/* Open badge */}
            <div
              className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "white",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ADE80" }} />
              Open Today
            </div>
            {/* Text content */}
            <div className="relative z-10 flex flex-col justify-end p-8 h-full">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Premium Beauty Studio
              </p>
              <p
                className="text-3xl font-semibold text-white leading-tight"
                style={{ letterSpacing: "-0.025em" }}
              >
                {vendorData.name}
              </p>
              <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                {vendorData.location}
              </p>
            </div>
          </div>
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
          <div className="grid sm:grid-cols-2 gap-2.5">
            {featuredServices.map((svc) => (
              <Link
                key={svc.id}
                href={`/${slug}/book`}
                className="flex items-center gap-3.5 p-4 rounded-[var(--rl)] transition-all duration-150 hover:translate-y-[-1px]"
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
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
                  >
                    {svc.name}
                  </p>
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
              View all {services.length} services
              <ArrowRight size={13} />
            </Link>
          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                href={`/${slug}/shop`}
                className="rounded-[var(--rl)] overflow-hidden transition-all duration-150 hover:translate-y-[-2px]"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{ background: "var(--bg3)" }}
                >
                  <ShoppingBag size={26} style={{ color: "var(--tx3)" }} />
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
              background: "linear-gradient(135deg, #C0283A 0%, #7A1524 100%)",
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
                color: "#C0283A",
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
