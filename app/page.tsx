import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/shared/Logo";
import { SITE_URL } from "@/lib/site";
import {
  ArrowRight,
  Calendar,
  ShoppingBag,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  Palette,
  Timer,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Booktns — Booking & storefront software for Ghanaian beauty businesses",
  description:
    "Give your salon or spa a real online storefront. Customers book and pay a deposit in under two minutes — no app, no account, no double-bookings. Built for Ghana.",
  alternates: { canonical: "/" },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Booktns",
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
  description:
    "Booking and storefront software for beauty service vendors in Ghana — appointments, a product shop, and order management in one place.",
};

// The signature device: every screenshot on this page sits inside a fake
// browser window, not a soft-shadow card — storefronts never show a picture
// of themselves, so this alone reads as "software product page," not
// "another beauty storefront."
function BrowserWindow({
  url,
  label,
  children,
}: {
  url: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      className="rounded-[14px] overflow-hidden"
      style={{ background: "var(--bg2)", border: "1px solid var(--bd)", boxShadow: "var(--shadow-lg)" }}
    >
      <div
        className="flex items-center gap-3 px-3.5 py-2.5"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22C55E" }} />
        </div>
        <div
          className="flex-1 text-center text-[11px] py-1 rounded-full truncate px-3"
          style={{ background: "var(--bg3)", color: "var(--tx3)" }}
        >
          {url}
        </div>
      </div>
      <div className="relative aspect-[16/10]" style={{ background: "var(--bg)" }}>
        {children}
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

// Real screenshot when one's been captured (src set); otherwise an abstract
// stand-in so the page never ships broken or half-finished while waiting on
// one (e.g. the dashboard shot, which needs an authenticated session to take).
function ScreenshotPlaceholder({
  tone,
  src,
  alt,
}: {
  tone: "storefront" | "booking" | "dashboard";
  src?: string;
  alt?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} className="absolute inset-0 w-full h-full object-cover object-top" />
    );
  }

  const rows = tone === "dashboard" ? 4 : 3;
  return (
    <div className="absolute inset-0 flex flex-col gap-2 p-4">
      <div className="h-3 w-2/5 rounded" style={{ background: "var(--bg3)" }} />
      <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: tone === "dashboard" ? "80px 1fr" : "1fr" }}>
        {tone === "dashboard" && <div className="rounded-lg" style={{ background: "var(--bg2)" }} />}
        <div className="flex flex-col gap-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-lg"
              style={{ background: i === 0 ? "var(--ac-bg)" : "var(--bg2)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const capabilities = [
  {
    icon: Palette,
    eyebrow: "Storefront & shop",
    title: "A page that's actually yours",
    desc: "Your own booktns.com/yourname page — pick from four colour themes, a cover photo, gallery or video hero, and a built-in shop for the products you already sell.",
  },
  {
    icon: Calendar,
    eyebrow: "Booking engine",
    title: "Real availability, not a guess",
    desc: "Slots are checked against your actual schedule and staff at the moment of booking — deposits get a reference code, and confirmed bookings generate a downloadable PDF automatically.",
  },
  {
    icon: LayoutDashboard,
    eyebrow: "Dashboard & staff",
    title: "Sign in with Google — that's it",
    desc: "No passwords to lose or share. Add your team with a role — Owner, Management, or Service — and each of them only sees what they're supposed to.",
  },
  {
    icon: Mail,
    eyebrow: "Notifications",
    title: "You hear about it immediately",
    desc: "Email and SMS the moment a booking or order comes in — to you and to the customer — so nothing sits unseen until you happen to check.",
  },
];

const journeySteps = [
  {
    tag: "1. Discover",
    title: "A customer finds your storefront",
    desc: "Services, prices, and your shop — laid out clearly, no account required to look around.",
    url: "booktns.com/glambyrose",
    tone: "storefront" as const,
    image: "/landing/storefront.png",
  },
  {
    tag: "2. Book",
    title: "They book in under two minutes",
    desc: "Pick a service, a preferred stylist, a real open slot, and pay a deposit if you require one.",
    url: "booktns.com/glambyrose/book",
    tone: "booking" as const,
    image: "/landing/booking-datetime.png",
  },
  {
    tag: "3. You're notified",
    title: "You confirm it from your dashboard",
    desc: "An email and text land immediately. Confirm with one tap and a PDF goes out automatically.",
    url: "booktns.com/dashboard",
    tone: "dashboard" as const,
    image: "/landing/dashboard.png",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 md:px-12 py-4 sticky top-0 z-30"
        style={{
          background: "var(--bg)",
          borderBottom: "1px solid var(--bd)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <Logo size="md" href="/" />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)]"
            style={{ color: "var(--tx2)" }}
          >
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-medium px-4 py-2.5 rounded-[var(--r)] text-white"
            style={{
              background: "var(--ac)",
              boxShadow: "0 1px 3px rgba(192,40,58,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero — split: copy left, layered real-product screenshots right */}
        <section className="relative px-6 md:px-12 pt-16 md:pt-24 pb-20 md:pb-28 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 50% at 85% 20%, rgba(192,40,58,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="relative grid lg:grid-cols-[1fr_1fr] gap-14 lg:gap-8 items-center max-w-6xl mx-auto">
            <div>
              <div
                className="anim-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
                style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ac)" }} />
                Demo storefront: Glam by Rose
              </div>
              <h1
                className="anim-fade-up anim-d1 text-4xl md:text-6xl font-semibold leading-[1.1] mb-6"
                style={{ color: "var(--tx)", letterSpacing: "-0.03em" }}
              >
                Your booking book,
                <br />
                <span style={{ color: "var(--ac)" }}>finally online</span>
              </h1>
              <p
                className="anim-fade-up anim-d2 text-base md:text-lg mb-9 max-w-md leading-relaxed"
                style={{ color: "var(--tx2)" }}
              >
                Replace the notebook and the back-and-forth DMs with a real storefront. Customers see
                what&apos;s actually open, book it themselves, and you get notified the second they do.
              </p>
              <div className="anim-fade-up anim-d3 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--r)] text-white font-medium text-sm"
                  style={{
                    background: "var(--ac)",
                    boxShadow: "0 1px 3px rgba(192,40,58,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  Create your storefront
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/glambyrose"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--r)] font-medium text-sm"
                  style={{ background: "var(--bg3)", color: "var(--tx)", boxShadow: "var(--shadow-sm)" }}
                >
                  View demo storefront
                </Link>
              </div>
            </div>

            {/* Layered screenshot stack */}
            <div className="relative">
              <div className="hidden md:block absolute -top-6 -right-6 w-[85%] opacity-70 -z-10">
                <BrowserWindow url="booktns.com/glambyrose/book" label="The booking flow">
                  <ScreenshotPlaceholder
                    tone="booking"
                    src="/landing/booking-datetime.png"
                    alt="Picking a date and time on the booking flow, with real open slots"
                  />
                </BrowserWindow>
              </div>
              <BrowserWindow url="booktns.com/glambyrose" label="A vendor's live storefront">
                <ScreenshotPlaceholder
                  tone="storefront"
                  src="/landing/storefront.png"
                  alt="Glam by Rose's live storefront, a Booktns demo vendor"
                />
              </BrowserWindow>
            </div>
          </div>
        </section>

        {/* Grounding — specific, not generic SaaS copy */}
        <section
          className="px-6 md:px-12 py-14"
          style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)", borderBottom: "1px solid var(--bds)" }}
        >
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg md:text-xl leading-relaxed" style={{ color: "var(--tx)" }}>
              Built for Ghanaian hair, nail, skin, lash, and brow businesses —{" "}
              <span style={{ color: "var(--tx2)" }}>
                not adapted from a generic scheduling tool. Deposits in cedis, mobile-money or bank
                payment details, and no customer account required to book.
              </span>
            </p>
          </div>
        </section>

        {/* Capabilities — bordered list, not a card grid, to read distinctly from a storefront's product cards */}
        <section className="px-6 md:px-12 py-20 max-w-5xl mx-auto w-full">
          <p className="text-xs font-semibold uppercase tracking-widest mb-10" style={{ color: "var(--tx3)" }}>
            What&apos;s actually in the box
          </p>
          <div className="flex flex-col" style={{ borderTop: "1px solid var(--bds)" }}>
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="grid md:grid-cols-[200px_1fr] gap-3 md:gap-10 py-8"
                  style={{ borderBottom: "1px solid var(--bds)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--ac-bg)" }}
                    >
                      <Icon size={15} style={{ color: "var(--ac)" }} />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
                      {c.eyebrow}
                    </p>
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold mb-1.5"
                      style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}
                    >
                      {c.title}
                    </h3>
                    <p className="text-sm leading-relaxed max-w-xl" style={{ color: "var(--tx2)" }}>
                      {c.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* The journey — a real sequence, so numbering is earned here */}
        <section className="px-6 md:px-12 py-20" style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest mb-10" style={{ color: "var(--tx3)" }}>
              How a booking actually happens
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {journeySteps.map((step) => (
                <div key={step.tag}>
                  <BrowserWindow url={step.url} label={step.title}>
                    <ScreenshotPlaceholder tone={step.tone} src={step.image} alt={step.title} />
                  </BrowserWindow>
                  <p className="text-xs font-semibold mt-4 mb-1.5" style={{ color: "var(--ac)" }}>
                    {step.tag}
                  </p>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--tx)" }}>
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--tx3)" }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real, specific stats — no fabricated multi-country claim */}
        <section className="px-6 md:px-12 py-14">
          <div className="max-w-5xl mx-auto flex flex-wrap gap-10 items-center justify-center md:justify-start">
            {[
              { icon: Timer, number: "< 2 min", label: "average booking time" },
              { icon: ShieldCheck, number: "Google", label: "sign-in — no passwords" },
              { icon: ShoppingBag, number: "Built-in", label: "product shop, not a plugin" },
              { icon: Calendar, number: "Ghana", label: "GHS pricing, built for here" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <Icon size={18} style={{ color: "var(--ac)" }} />
                  <div>
                    <p className="text-base font-semibold" style={{ color: "var(--tx)", letterSpacing: "-0.02em" }}>
                      {item.number}
                    </p>
                    <p className="text-xs" style={{ color: "var(--tx3)" }}>
                      {item.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="relative px-6 md:px-12 py-20 md:py-28 overflow-hidden" style={{ borderTop: "1px solid var(--bds)" }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 50% 80% at 10% 50%, rgba(192,40,58,0.06) 0%, transparent 70%)" }}
          />
          <div className="max-w-lg relative mx-auto text-center md:text-left md:mx-0">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: "var(--tx)", letterSpacing: "-0.025em" }}>
              Ready to take your business online?
            </h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--tx2)" }}>
              Set up your storefront in under five minutes. No technical knowledge required.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-[var(--r)] text-white font-medium text-sm"
              style={{
                background: "var(--ac)",
                boxShadow: "0 1px 3px rgba(192,40,58,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              Create your storefront
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-5 flex items-center justify-between" style={{ borderTop: "1px solid var(--bd)" }}>
        <Logo size="sm" />
        <p className="text-xs" style={{ color: "var(--tx3)" }}>
          © {new Date().getFullYear()} Booktns
        </p>
      </footer>
    </div>
  );
}
