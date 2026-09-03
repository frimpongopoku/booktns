import { ArrowRight, Store } from "lucide-react";
import { SITE_URL } from "@/lib/site";

interface StartYourOwnShopLinkProps {
  className?: string;
  // "quiet" is the footer line that sits under a vendor's own branding;
  // "card" is the slightly more present block used at the end of a
  // confirmation page, where the customer has finished what they came for.
  variant?: "quiet" | "card";
}

// A vendor storefront's best audience for Booktns itself is the person
// already browsing it — but this must never compete with the shop they came
// for, so it stays a small line under the vendor's own footer rather than a
// banner.
//
// The href is absolute rather than "/onboarding" so that a storefront served
// on a vendor's verified custom domain sends the visitor to the Booktns
// domain rather than signing them up under someone else's shop URL. (The
// relative path would resolve — proxy.ts excludes /onboarding from
// slug-rewriting — but it would leave them on the vendor's domain.)
const ONBOARDING_URL = `${SITE_URL}/onboarding`;

export default function StartYourOwnShopLink({ className = "", variant = "quiet" }: StartYourOwnShopLinkProps) {
  if (variant === "card") {
    return (
      <a
        href={ONBOARDING_URL}
        className={`flex items-center gap-3 p-3.5 rounded-[var(--rl)] transition-colors hover:bg-[var(--bg3)] ${className}`}
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <span
          className="w-8 h-8 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
        >
          <Store size={15} />
        </span>
        <span className="flex-1 text-left">
          <span className="block text-sm font-medium" style={{ color: "var(--tx)" }}>
            Run a shop of your own?
          </span>
          <span className="block text-xs" style={{ color: "var(--tx3)" }}>
            Set up bookings and a storefront like this one, free to start.
          </span>
        </span>
        <ArrowRight size={14} className="flex-shrink-0" style={{ color: "var(--tx3)" }} />
      </a>
    );
  }

  return (
    <a
      href={ONBOARDING_URL}
      className={`text-xs inline-flex items-center gap-1 hover:underline underline-offset-2 ${className}`}
      style={{ color: "var(--tx3)" }}
    >
      Run a shop of your own?{" "}
      <span className="font-medium" style={{ color: "var(--tx2)" }}>
        Get your own booking page
      </span>
      <ArrowRight size={11} />
    </a>
  );
}
