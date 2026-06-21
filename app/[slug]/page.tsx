import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorBySlug, services, products, formatPrice, formatDuration } from "@/lib/data";
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
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Hair: <Scissors size={16} />,
  Nails: <Hand size={16} />,
  Skin: <Sparkles size={16} />,
  Lashes: <Eye size={16} />,
  Other: <Sparkles size={16} />,
};

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params;
  const vendorData = getVendorBySlug(slug);

  if (!vendorData) notFound();

  const featuredServices = services.slice(0, 4);
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="min-h-screen pb-16 md:pb-0" style={{ background: "var(--bg)" }}>
      <StorefrontNav slug={slug} vendorName={vendorData.name} />

      {/* Mobile header */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-4"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        <p
          className="font-display text-lg font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          {vendorData.name}
        </p>
        <Link
          href={`/${slug}/book`}
          className="px-3 py-1.5 rounded-[var(--r)] text-sm font-medium text-white"
          style={{ background: "var(--ac)" }}
        >
          Book Now
        </Link>
      </div>

      {/* Hero */}
      <section className="px-4 md:px-8 py-8 md:py-14">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          {/* Left: text */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{ background: "var(--green-bg)", color: "var(--green)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
              Open today · {vendorData.hours}
            </div>

            <h1
              className="font-display text-3xl md:text-5xl font-medium leading-tight mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              {vendorData.name}
            </h1>
            <p className="text-base mb-6" style={{ color: "var(--tx2)" }}>
              {vendorData.description}
            </p>
            <div className="flex flex-col gap-2 mb-8">
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx2)" }}>{vendorData.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx2)" }}>{vendorData.hours}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/${slug}/book`}
                className="px-6 py-2.5 rounded-[var(--r)] text-white font-medium text-sm inline-flex items-center gap-2"
                style={{ background: "var(--ac)" }}
              >
                Book Appointment
                <ArrowRight size={14} />
              </Link>
              <Link
                href={`/${slug}/shop`}
                className="px-6 py-2.5 rounded-[var(--r)] font-medium text-sm inline-flex items-center gap-2"
                style={{ background: "var(--bg3)", color: "var(--tx)" }}
              >
                <ShoppingBag size={14} />
                Shop
              </Link>
            </div>
          </div>

          {/* Right: cover image placeholder */}
          <div
            className="hidden md:flex relative rounded-[var(--rl)] overflow-hidden aspect-[4/3] items-center justify-center"
            style={{ background: "var(--bg3)" }}
          >
            {/* Decorative pattern */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `radial-gradient(var(--ac) 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative text-center px-8">
              <p
                className="font-display text-4xl font-medium mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}
              >
                Glam by Rose
              </p>
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                Premium beauty services
              </p>
            </div>
            {/* Open badge */}
            <div
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "var(--green-bg)", color: "var(--green)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
              Open Today
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section
        id="services"
        className="px-4 md:px-8 py-10"
        style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="font-display text-2xl font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              Services
            </h2>
            <Link
              href={`/${slug}/book`}
              className="text-sm font-medium"
              style={{ color: "var(--ac)" }}
            >
              Book now →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {featuredServices.map((svc) => (
              <Link
                key={svc.id}
                href={`/${slug}/book`}
                className="flex items-center gap-3 p-4 rounded-[var(--rl)] hover:bg-[var(--bg3)] transition-colors"
                style={{ background: "var(--bg)", border: "1px solid var(--bds)" }}
              >
                <div
                  className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                >
                  {CATEGORY_ICONS[svc.category] ?? <Sparkles size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{svc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={11} style={{ color: "var(--tx3)" }} />
                    <span className="text-xs" style={{ color: "var(--tx3)" }}>
                      {formatDuration(svc.durationMinutes)}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--tx)" }}>
                  {formatPrice(svc.priceInPesewas)}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              href={`/${slug}/book`}
              className="text-sm font-medium inline-flex items-center gap-1"
              style={{ color: "var(--ac)" }}
            >
              View all {services.length} services
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="font-display text-2xl font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              Shop
            </h2>
            <Link
              href={`/${slug}/shop`}
              className="text-sm font-medium"
              style={{ color: "var(--ac)" }}
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                href={`/${slug}/shop`}
                className="rounded-[var(--rl)] overflow-hidden hover:opacity-90 transition-opacity"
                style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
              >
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{ background: "var(--bg3)" }}
                >
                  <ShoppingBag size={28} style={{ color: "var(--tx3)" }} />
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium mb-1 truncate" style={{ color: "var(--tx)" }}>
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

      {/* Why book with us */}
      <section
        className="px-4 md:px-8 py-10"
        style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="font-display text-xl font-medium mb-6"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            Why book with us
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: <CheckCircle size={18} />, title: "Instant confirmation", desc: "Get a WhatsApp confirmation within minutes of booking." },
              { icon: <MessageCircle size={18} />, title: "Easy rescheduling", desc: "Need to move an appointment? Just message us on WhatsApp." },
              { icon: <Clock size={18} />, title: "On time, every time", desc: "We respect your time. Punctuality is our promise." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div
                  className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--tx2)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
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
          <span className="font-medium" style={{ color: "var(--ac)" }}>
            Booktns
          </span>
        </Link>
      </footer>

      <MobileStorefrontNav slug={slug} />
    </div>
  );
}
