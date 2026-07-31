import { createHmac, timingSafeEqual } from "crypto";
import type { BookingStatus } from "@/types";

// The calendar feed URL is fetched by Google/Apple/Outlook's own background
// poller on their schedule, not by a logged-in browser — there's no session
// cookie to check. The token is self-verifying instead (HMAC-signed vendorId,
// same "the URL is the credential" trust model already used for booking/order
// confirmation links), so no DB lookup or stored-token table is needed.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

function sign(vendorId: string): string {
  return createHmac("sha256", getSecret()).update(vendorId).digest("hex").slice(0, 32);
}

export function buildCalendarFeedToken(vendorId: string): string {
  return `${Buffer.from(vendorId, "utf-8").toString("base64url")}.${sign(vendorId)}`;
}

export function verifyCalendarFeedToken(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  let vendorId: string;
  try {
    vendorId = Buffer.from(encoded, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const expected = Buffer.from(sign(vendorId), "utf-8");
  const actual = Buffer.from(signature, "utf-8");
  if (actual.length !== expected.length) return null;
  return timingSafeEqual(actual, expected) ? vendorId : null;
}

interface FeedBooking {
  id: string;
  customerName: string;
  services: { name: string }[];
  startTime: string;
  endTime: string;
  status: BookingStatus;
  assignedStaffName?: string;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// Real UTC instant (DTSTAMP marks when this feed was generated) — unlike the
// appointment times below, this one legitimately gets a "Z".
function toIcsUtcTimestamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

// Same reasoning as lib/calendar.ts's single-event Google Calendar link:
// booking times are Ghana wall-clock stored in UTC-labelled fields, so no
// "Z" here — paired with TZID=Africa/Accra on the DTSTART/DTEND lines
// instead, which every mainstream calendar client resolves correctly
// without needing an embedded VTIMEZONE block for a well-known Olson id.
function toIcsLocalTimestamp(iso: string): string {
  return iso.replace(/[-:]/g, "").split(".")[0];
}

export function buildBookingsIcsFeed(vendorName: string, bookings: FeedBooking[]): string {
  const generatedAt = toIcsUtcTimestamp(new Date());

  const events = bookings.map((b) => {
    const summary = escapeIcsText(`${b.customerName} — ${b.services.map((s) => s.name).join(", ")}`);
    const descriptionLines = [`Status: ${b.status}`, b.assignedStaffName ? `Staff: ${b.assignedStaffName}` : null].filter(
      (line): line is string => Boolean(line)
    );
    return [
      "BEGIN:VEVENT",
      `UID:${b.id}@booktns.com`,
      `DTSTAMP:${generatedAt}`,
      `DTSTART;TZID=Africa/Accra:${toIcsLocalTimestamp(b.startTime)}`,
      `DTEND;TZID=Africa/Accra:${toIcsLocalTimestamp(b.endTime)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
      `STATUS:${b.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booktns//Booking Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`${vendorName} — Booktns`)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
