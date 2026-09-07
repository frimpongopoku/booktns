import Link from "next/link";
import Logo from "@/components/shared/Logo";
import { Store, Search, Globe } from "lucide-react";

interface StorefrontUnavailableProps {
  // "suspended" renders deliberately neutral copy. The vendor's
  // suspendedReason is an internal note — it goes to the vendor in their own
  // dashboard, never to a shopper standing on their storefront.
  //
  // "domain-not-verified" is distinct from "not-published": the shop itself
  // is live and open at its regular booktns.com/{slug} URL, it's only THIS
  // custom domain that isn't hooked up yet — a visitor who typed the vendor's
  // own domain shouldn't be told the shop doesn't exist, they should be
  // pointed at the URL that actually works right now (see platformUrl).
  reason: "not-found" | "not-published" | "suspended" | "domain-not-verified";
  vendorName?: string;
  platformUrl?: string;
}

export default function StorefrontUnavailable({ reason, vendorName, platformUrl }: StorefrontUnavailableProps) {
  const isNotPublished = reason === "not-published";
  const isDomainPending = reason === "domain-not-verified";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center" style={{ background: "var(--bg)" }}>
      <div className="mb-8">
        <Logo size="md" href="/" />
      </div>

      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: isNotPublished || isDomainPending ? "var(--amber-bg)" : "var(--bg2)" }}
      >
        {isDomainPending ? (
          <Globe size={26} style={{ color: "var(--amber)" }} />
        ) : isNotPublished ? (
          <Store size={26} style={{ color: "var(--amber)" }} />
        ) : (
          <Search size={26} style={{ color: "var(--tx3)" }} />
        )}
      </div>

      <h1
        className="font-display text-2xl md:text-3xl font-medium mb-3"
        style={{ fontFamily: "var(--font-display)", color: "var(--tx)", letterSpacing: "-0.02em" }}
      >
        {isDomainPending
          ? "This domain isn't connected yet"
          : isNotPublished
            ? `${vendorName} is getting ready`
            : reason === "suspended"
              ? "This shop is unavailable"
              : "We couldn't find that shop"}
      </h1>

      <p className="text-base max-w-sm mb-8 leading-relaxed" style={{ color: "var(--tx2)" }}>
        {isDomainPending
          ? `${vendorName} is still setting up this custom domain — the shop itself is open, just not here yet.`
          : isNotPublished
            ? "This storefront isn't open to the public yet — the owner is still setting things up. Check back soon."
            : reason === "suspended"
              ? "This storefront isn't available right now. If you were in the middle of an order, contact the vendor directly."
              : "The link you followed might be broken, or this shop may no longer be available."}
      </p>

      <div className="flex items-center gap-3">
        {isDomainPending && platformUrl && (
          <a
            href={platformUrl}
            className="px-5 py-2.5 rounded-[var(--r)] text-base font-medium text-white"
            style={{ background: "var(--ac)" }}
          >
            Visit the shop
          </a>
        )}
        <Link
          href="/"
          className="px-5 py-2.5 rounded-[var(--r)] text-base font-medium"
          style={{ background: "var(--bg3)", color: "var(--tx)" }}
        >
          Go to booktns
        </Link>
      </div>
    </div>
  );
}
