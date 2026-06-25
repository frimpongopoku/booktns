import Link from "next/link";
import Logo from "@/components/shared/Logo";
import { ArrowRight, Calendar, ShoppingBag, MessageCircle, Sparkles } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Bookings, effortlessly",
    desc: "Customers book in under 2 minutes. You get WhatsApp notifications instantly.",
  },
  {
    icon: ShoppingBag,
    title: "Sell your products",
    desc: "A built-in shop for your hair oils, skincare, and nail kits — right on your storefront.",
  },
  {
    icon: MessageCircle,
    title: "Manage via WhatsApp",
    desc: "Confirm, reschedule, and cancel bookings straight from your WhatsApp inbox.",
  },
  {
    icon: Sparkles,
    title: "Your brand, your storefront",
    desc: "A beautiful public page customers can bookmark — no app download needed.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 md:px-12 py-4 sticky top-0 z-30"
        style={{
          background: "rgba(250,250,250,0.85)",
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

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="relative px-6 md:px-12 py-20 md:py-32 overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 75% 40%, rgba(192,40,58,0.09) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 40% 40% at 85% 70%, rgba(192,40,58,0.05) 0%, transparent 60%)",
            }}
          />

          <div className="max-w-3xl relative">
            <div
              className="anim-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-10"
              style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ac)" }} />
              Demo: Glam by Rose is live
            </div>
            <h1
              className="anim-fade-up anim-d1 text-5xl md:text-7xl font-semibold leading-[1.08] mb-7"
              style={{ color: "var(--tx)", letterSpacing: "-0.03em" }}
            >
              Bookings &amp; orders
              <br />
              <span style={{ color: "var(--ac)" }}>for beauty vendors</span>
            </h1>
            <p
              className="anim-fade-up anim-d2 text-base md:text-lg mb-10 max-w-xl leading-relaxed"
              style={{ color: "var(--tx2)" }}
            >
              Give your beauty business a stunning storefront. Let customers book appointments and
              buy products — all managed through WhatsApp.
            </p>
            <div className="anim-fade-up anim-d3 flex flex-col sm:flex-row gap-3">
              <Link
                href="/glambyrose"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r)] text-white font-medium text-sm"
                style={{
                  background: "var(--ac)",
                  boxShadow: "0 1px 3px rgba(192,40,58,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                View demo storefront
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r)] font-medium text-sm"
                style={{
                  background: "var(--bg3)",
                  color: "var(--tx)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Open demo dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          className="px-6 md:px-12 py-16"
          style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-10"
            style={{ color: "var(--tx3)" }}
          >
            Everything your business needs
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-[var(--rl)]"
                  style={{
                    background: "var(--bg)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center mb-5"
                    style={{ background: "var(--ac-bg)" }}
                  >
                    <Icon size={17} style={{ color: "var(--ac)" }} />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--tx)", letterSpacing: "-0.01em" }}>
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--tx2)" }}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Social proof strip */}
        <section
          className="px-6 md:px-12 py-10"
          style={{ borderBottom: "1px solid var(--bds)" }}
        >
          <div className="flex flex-wrap gap-8 items-center justify-center md:justify-start">
            {[
              { number: "2 min", label: "average booking time" },
              { number: "WhatsApp", label: "all notifications" },
              { number: "Zero", label: "customer accounts needed" },
              { number: "v1", label: "launching in Ghana & Nigeria" },
            ].map((item) => (
              <div key={item.label} className="text-center md:text-left">
                <p
                  className="text-xl font-semibold"
                  style={{ color: "var(--tx)", letterSpacing: "-0.025em" }}
                >
                  {item.number}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative px-6 md:px-12 py-20 md:py-28 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 50% 80% at 10% 50%, rgba(192,40,58,0.06) 0%, transparent 70%)",
            }}
          />
          <div className="max-w-lg relative">
            <h2
              className="text-3xl md:text-4xl font-semibold mb-4"
              style={{ color: "var(--tx)", letterSpacing: "-0.025em" }}
            >
              Ready to take your business online?
            </h2>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--tx2)" }}>
              Set up your storefront in under 5 minutes. No technical knowledge required.
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
      <footer
        className="px-6 md:px-12 py-5 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--bd)" }}
      >
        <Logo size="sm" />
        <p className="text-xs" style={{ color: "var(--tx3)" }}>
          © 2025 Booktns
        </p>
      </footer>
    </div>
  );
}
