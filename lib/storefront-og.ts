import { formatPrice } from "@/lib/data";
import { fetchImageAsPngDataUri } from "@/lib/image";
import type { StorefrontVendor } from "@/lib/vendors";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "9:00" -> "9am", "17:30" -> "5:30pm". Business hours are stored as plain
// "HH:MM" strings, so this is string formatting, not date maths.
function formatHour(time: string): string {
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (Number.isNaN(hour)) return time;

  const suffix = hour < 12 ? "am" : "pm";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${displayHour}:${rawMinute}${suffix}` : `${displayHour}${suffix}`;
}

// The vendor's hours for the day the card is being generated on. Ghana is
// UTC+0, matching the assumption in lib/availability.ts, so "today" comes
// from UTC rather than the render machine's local time.
function todaysHours(vendor: StorefrontVendor): string | null {
  const today = vendor.businessHours.find((h) => h.dayOfWeek === new Date().getUTCDay());
  if (!today) return null;
  if (today.isClosed) return `Closed ${DAY_LABELS[today.dayOfWeek]}`;
  if (!today.openTime || !today.closeTime) return null;
  return `Open today ${formatHour(today.openTime)}–${formatHour(today.closeTime)}`;
}

// The short facts printed on a shared storefront card. This is the whole
// point of the richer OG image: someone seeing the link in a WhatsApp group
// should learn what the shop actually offers without opening it.
export function vendorOgFacts(vendor: StorefrontVendor): string[] {
  const facts: string[] = [];

  if (vendor.services.length > 0) {
    facts.push(`${vendor.services.length} service${vendor.services.length === 1 ? "" : "s"}`);
    const cheapest = Math.min(...vendor.services.map((s) => s.priceInPesewas));
    facts.push(`From ${formatPrice(cheapest)}`);
  }

  if (vendor.products.length > 0) {
    facts.push(`${vendor.products.length} product${vendor.products.length === 1 ? "" : "s"}`);
  }

  const hours = todaysHours(vendor);
  if (hours) facts.push(hours);

  // Four pills is what fits on one row at this width before wrapping looks
  // accidental rather than designed.
  return facts.slice(0, 4);
}

// Satori can neither fetch a remote URL nor decode the WebP that every
// upload is stored as, so both images are fetched and transcoded here and
// handed to the card as data URIs. Fetched in parallel — an OG route is on
// the critical path of a link preview, which crawlers time out on.
export async function vendorOgBranding(vendor: StorefrontVendor): Promise<{
  logoDataUri: string | null;
  coverDataUri: string | null;
}> {
  const [logoDataUri, coverDataUri] = await Promise.all([
    vendor.logoUrl ? fetchImageAsPngDataUri(vendor.logoUrl) : null,
    vendor.coverImageUrl ? fetchImageAsPngDataUri(vendor.coverImageUrl, 1200) : null,
  ]);
  return { logoDataUri, coverDataUri };
}
