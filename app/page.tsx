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
      <header className="flex items-center justify-between px-6 md:px-12 py-5" style={{ borderBottom: "1px solid var(--bd)" }}>
        <Logo size="md" href="/" />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-[var(--r)] transition-colors hover:bg-[var(--bg3)]"
            style={{ color: "var(--tx2)" }}
          >
            Log in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-medium px-4 py-2 rounded-[var(--r)] text-white"
            style={{ background: "var(--ac)" }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="px-6 md:px-12 py-16 md:py-24 max-w-3xl">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ac)" }} />
            Demo: Glam by Rose is live
          </div>
          <h1
            className="font-display text-4xl md:text-6xl font-medium leading-tight mb-6"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            Bookings &amp; orders
            <br />
            <span style={{ color: "var(--ac)" }}>for beauty vendors</span>
          </h1>
          <p className="text-base md:text-lg mb-10 max-w-xl" style={{ color: "var(--tx2)" }}>
            Give your beauty business a stunning storefront. Let customers book appointments and buy
            products — all managed through WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/glambyrose"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r)] text-white font-medium"
              style={{ background: "var(--ac)" }}
            >
              View demo storefront
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r)] font-medium"
              style={{ background: "var(--bg3)", color: "var(--tx)" }}
            >
              Open demo dashboard
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 md:px-12 py-12" style={{ background: "var(--bg2)", borderTop: "1px solid var(--bds)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-8" style={{ color: "var(--tx3)" }}>
            Everything your business needs
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-[var(--rl)]"
                  style={{ background: "var(--bg)", border: "1px solid var(--bds)" }}
                >
                  <div
                    className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center mb-4"
                    style={{ background: "var(--ac-bg)" }}
                  >
                    <Icon size={18} style={{ color: "var(--ac)" }} />
                  </div>
                  <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--tx)" }}>
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

        {/* CTA */}
        <section className="px-6 md:px-12 py-16 text-center">
          <h2
            className="font-display text-2xl md:text-3xl font-medium mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            Ready to take your business online?
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--tx2)" }}>
            Set up your storefront in under 5 minutes.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-[var(--r)] text-white font-medium text-base"
            style={{ background: "var(--ac)" }}
          >
            Create your storefront
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="px-6 md:px-12 py-6 flex items-center justify-between"
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
