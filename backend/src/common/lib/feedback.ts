// Product feedback, distinct from the vendor support channel in
// app/api/support/route.ts: support is an authenticated vendor asking the
// platform team for help with their own account; this is anyone — a vendor,
// a shopper on a storefront, a visitor to the landing page — telling us
// what they think of Booktns.
//
// Both land in the same inbox (SUPPORT_INBOX_EMAIL). Read server-side only;
// never expose this with a NEXT_PUBLIC_ prefix, and pass it to client
// components as a prop so it can't drift out of the server boundary.
// Where feedback goes when SUPPORT_INBOX_EMAIL isn't configured. A real
// monitored address on the operating entity's own domain (Biibisoft — the
// same company named in /privacy and /terms, see lib/legal.ts), so an
// unconfigured deploy quietly still reaches a human instead of returning a
// 503 to someone who took the trouble to write in.
export const FALLBACK_SUPPORT_EMAIL = "support@biibisoft.com";

export function getFeedbackInboxEmail(): string {
  return process.env.SUPPORT_INBOX_EMAIL?.trim() || FALLBACK_SUPPORT_EMAIL;
}

export const FEEDBACK_SOURCES = ["dashboard", "storefront", "landing"] as const;
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];
