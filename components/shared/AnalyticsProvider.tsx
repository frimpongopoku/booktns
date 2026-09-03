"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

// Analytics exist to answer questions about the *storefront* — which shops
// get visited, and what happens once someone is in one. The vendor dashboard
// is deliberately excluded: we already know what staff do in there, and a
// vendor's own admin traffic would otherwise inflate the numbers for their
// own shop.
const EXCLUDED_PREFIXES = ["/dashboard", "/login", "/onboarding"];

export function isExcludedFromAnalytics(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Never load the library at all on an admin page, so the dashboard
    // carries none of its weight and sets none of its cookies.
    if (isExcludedFromAnalytics(window.location.pathname)) return;
    if (posthog.__loaded) return;

    posthog.init(key, {
      // Requests go to our own /ingest path, which next.config.ts rewrites
      // to PostHog. A first-party path isn't blocked by the content
      // blockers that a posthog.com request is, so the numbers reflect
      // visitors rather than visitors-who-don't-block-analytics.
      api_host: "/ingest",
      // Where "view in PostHog" links point. Must be the real app URL, not
      // the proxy path above.
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com",

      // The App Router does not do a full page load between routes, so
      // without this only the first page of a visit is ever recorded.
      capture_pageview: "history_change",

      // Honour a browser's Do Not Track setting. We are not obliged to, and
      // most sites don't — but a visitor who has explicitly asked not to be
      // tracked has made their preference unambiguous.
      respect_dnt: true,

      // Storefront visitors are counted, never profiled. Nothing calls
      // identify(), so no person profile is ever created.
      person_profiles: "never",

      // Belt and braces for the exclusion above: if a session ever reaches
      // an admin route without a fresh page load, the event is dropped here
      // rather than relying on init having been skipped.
      before_send: (event) => {
        if (!event) return null;
        const url = event.properties?.$current_url;
        if (typeof url === "string") {
          try {
            if (isExcludedFromAnalytics(new URL(url).pathname)) return null;
          } catch {
            // Unparseable URL — let it through rather than lose the event.
          }
        }
        return event;
      },
    });
  }, []);

  // Vendor context as a super property, so every event — autocaptured ones
  // included — carries the shop it happened in without each call site
  // having to remember to attach it. This is what makes "which shops are
  // being visited, and what happens in them" answerable at all.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) return;

    const slug = vendorSlugFromPath(pathname);
    if (slug) {
      posthog.register({ vendor_slug: slug });
    } else {
      posthog.unregister("vendor_slug");
    }
  }, [pathname]);

  return <>{children}</>;
}

// Storefront routes are /{slug} and /{slug}/*. Everything else — the landing
// page, the legal pages, the post-booking confirmation pages — has no vendor
// in its path, so those return null and the super property is cleared.
const NON_VENDOR_ROOTS = new Set([
  "",
  "privacy",
  "terms",
  "booking",
  "order",
  "api",
  "ingest",
  "dashboard",
  "login",
  "onboarding",
]);

export function vendorSlugFromPath(pathname: string): string | null {
  const first = pathname.split("/")[1] ?? "";
  if (NON_VENDOR_ROOTS.has(first)) return null;
  return first;
}
