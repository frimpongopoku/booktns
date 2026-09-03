"use client";

import posthog from "posthog-js";

// Event names live here rather than as string literals at call sites, so a
// typo can't silently create a second, near-identical event in PostHog that
// nobody notices until a funnel comes back empty.
export const ANALYTICS_EVENTS = {
  // Storefront surfaces reached. Each carries vendor_slug automatically as
  // a super property (see AnalyticsProvider), so these answer "which shops
  // are being visited, and which parts of them".
  storefrontViewed: "storefront_viewed",
  shopViewed: "shop_viewed",
  productViewed: "product_viewed",
  payPageViewed: "pay_page_viewed",
  bookingPageViewed: "booking_page_viewed",

  // What happens once someone is in a shop.
  bookingStepCompleted: "booking_step_completed",
  bookingSubmitted: "booking_submitted",
  addedToCart: "added_to_cart",
  checkoutStarted: "checkout_started",
  orderSubmitted: "order_submitted",
  videoOpened: "video_opened",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// Only values safe to leave in a third-party analytics tool. Notably absent:
// anything identifying a *customer*. See captureEvent below.
export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export function isAnalyticsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

// There is deliberately no identify() helper here. Analytics cover the
// storefront only, where every visitor stays anonymous — see
// person_profiles: "never" in components/shared/AnalyticsProvider.tsx.

// Fire-and-forget event capture.
//
// **Never pass customer PII here** — no names, phone numbers, email
// addresses, or booking notes. Customers of a vendor never consented to
// being profiled in our analytics tool, and our Privacy Policy says we do
// not do it. Describe the *shape* of what happened instead (which vendor,
// how many services, what the total was), which is what the numbers are
// actually for.
export function captureEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (!isAnalyticsEnabled()) return;
  posthog.capture(event, properties);
}
