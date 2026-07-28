import { randomBytes } from "crypto";

// Excludes visually ambiguous characters (0/O, 1/I/l).
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

function randomSlugSuffix(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

// Public, URL-safe order slug, e.g. "ord_k4p9x2mqrz" — collision odds are
// astronomically low (32^10 combinations), so unlike generateOrderRef below,
// no retry-on-conflict is needed at the call site.
export function generateOrderSlug(): string {
  return `ord_${randomSlugSuffix(10)}`;
}

// Short human-facing reference shown to the customer/vendor (e.g. "ORD-048213"
// on the confirmation page) — deliberately small (6 digits, ~1M combinations)
// so it's easy to read aloud or type. Small enough that the call site DOES
// need to retry on a unique-constraint conflict, unlike the slug above.
export function generateOrderRef(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return `ORD-${String(n).padStart(6, "0")}`;
}

// Public, URL-safe booking slug, e.g. "booking_k4p9x2mqrz" — opaque like
// order slugs (a private receipt, not public catalog content), so no
// retry-on-conflict needed at the call site, same collision-odds reasoning
// as generateOrderSlug.
export function generateBookingSlug(): string {
  return `booking_${randomSlugSuffix(10)}`;
}

// Human-readable base slug for a product, e.g. "Argan Hair Oil" -> "argan-hair-oil".
// Unlike order/booking slugs this is deliberately readable — product pages are
// public catalog content meant to be found/shared, not private receipts.
// Generated once at creation and never changed, same convention as the rest
// of the app's slugs. Collision handling (appending "-2", "-3", ...) is the
// caller's job, scoped to whatever uniqueness the slug needs (per-vendor here).
export function slugifyProductName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "product";
}

// Appends "-2", "-3", ... to `base` until the result isn't in `taken`.
export function dedupeSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
