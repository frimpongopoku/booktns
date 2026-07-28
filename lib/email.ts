import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";
import type { Booking } from "@/types";
import { formatPrice } from "@/lib/data";

// Only what these templates actually reference — avoids requiring a full
// Vendor row (with every settings field) just to send an email.
interface VendorEmailInfo {
  name: string;
  cancellationPolicy?: string | null;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Booktns <bookings@booktns.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Resend throws synchronously if constructed without a key — built lazily
// (and only once RESEND_API_KEY is actually needed) so importing this module
// never crashes the booking flow before the env var is configured.
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// The Resend SDK resolves with { data: null, error } on an API-level failure
// (bad domain, invalid recipient, etc.) rather than throwing — awaiting
// client.emails.send() directly would silently swallow that as "success".
async function sendOrThrow(client: Resend, payload: CreateEmailOptions): Promise<void> {
  const { error } = await client.emails.send(payload);
  if (error) throw new Error(`Resend error (${error.name}): ${error.message}`);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

// Shared shell so all three emails look like they came from the same
// product rather than three ad-hoc templates.
function emailShell(vendorName: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181B;">
      <div style="padding: 24px 0; text-align: center; border-bottom: 1px solid #E4E4E7;">
        <span style="font-size: 20px; font-weight: 600;">
          <span style="color: #C0283A;">Book</span>tns
        </span>
      </div>
      <div style="padding: 24px 4px;">
        ${bodyHtml}
      </div>
      <div style="padding: 16px 0; text-align: center; border-top: 1px solid #E4E4E7; color: #A1A1AA; font-size: 12px;">
        Sent on behalf of ${vendorName} via Booktns
      </div>
    </div>
  `;
}

function servicesSummaryHtml(booking: Booking): string {
  const rows = booking.services
    .map(
      (s) =>
        `<tr><td style="padding: 4px 0; font-size: 14px;">${s.name}</td><td style="padding: 4px 0; font-size: 14px; text-align: right;">${formatPrice(s.priceAtBooking)}</td></tr>`
    )
    .join("");
  return `<table style="width: 100%; border-collapse: collapse;">${rows}</table>`;
}

function depositBlockHtml(booking: Booking, vendor: VendorEmailInfo): string {
  if (booking.depositAmountPesewas <= 0) return "";
  return `
    <div style="margin-top: 16px; padding: 12px 16px; background: #FFFBEB; border: 1px solid #F59E0B; border-radius: 8px;">
      <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #92400E;">
        Deposit required: ${formatPrice(booking.depositAmountPesewas)}
      </p>
      ${
        booking.depositReferenceCode
          ? `<p style="margin: 0; font-size: 14px; color: #92400E;">Reference code: <strong>${booking.depositReferenceCode}</strong> — include this in your payment description so ${vendor.name} can match it to your booking.</p>`
          : ""
      }
    </div>
  `;
}

export async function sendBookingRequestEmail(booking: Booking, vendor: VendorEmailInfo): Promise<void> {
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px;">Your booking request has been sent</h1>
    <p style="font-size: 14px; color: #52525B;">
      ${vendor.name} will confirm your appointment shortly. You can view or manage your booking any time using the link below.
    </p>
    <p style="margin: 20px 0;">
      <a href="${bookingUrl}" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        View your booking
      </a>
    </p>
    <p style="font-size: 13px; color: #A1A1AA; word-break: break-all;">${bookingUrl}</p>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4E4E7;">
      <p style="font-size: 13px; color: #71717A; margin: 0 0 8px;">${formatDateTime(booking.startTime)} · ${formatTime(booking.startTime)}</p>
      ${servicesSummaryHtml(booking)}
    </div>
    ${depositBlockHtml(booking, vendor)}
    ${
      vendor.cancellationPolicy
        ? `<div style="margin-top: 16px;"><p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #A1A1AA; margin: 0 0 4px;">Cancellation policy</p><p style="font-size: 13px; color: #71717A; margin: 0;">${vendor.cancellationPolicy}</p></div>`
        : ""
    }
    <p style="font-size: 13px; color: #71717A; margin-top: 16px;">
      You can cancel or edit your details from that page until ${vendor.name} confirms — after that, please reach out to them directly.
    </p>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendBookingRequestEmail");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: booking.customerEmail,
    subject: `Booking request received — ${vendor.name}`,
    html: emailShell(vendor.name, body),
  });
}

export async function sendBookingConfirmedEmail(booking: Booking, vendor: VendorEmailInfo): Promise<void> {
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px; color: #15803D;">Your booking is confirmed</h1>
    <p style="font-size: 14px; color: #52525B;">
      ${vendor.name} has confirmed your appointment for ${formatDateTime(booking.startTime)} at ${formatTime(booking.startTime)}.
    </p>
    <p style="margin: 20px 0;">
      <a href="${bookingUrl}" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        View booking &amp; download PDF
      </a>
    </p>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4E4E7;">
      ${servicesSummaryHtml(booking)}
    </div>
    ${depositBlockHtml(booking, vendor)}
    <p style="font-size: 13px; color: #71717A; margin-top: 16px;">
      Need to change or cancel? Reach out to ${vendor.name} directly — confirmed bookings can no longer be edited from this page.
    </p>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendBookingConfirmedEmail");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: booking.customerEmail,
    subject: `Booking confirmed — ${vendor.name}`,
    html: emailShell(vendor.name, body),
  });
}

export async function sendNewBookingNotification(booking: Booking, vendor: VendorEmailInfo, recipientEmails: string[]): Promise<void> {
  if (recipientEmails.length === 0) return;
  const dashboardUrl = `${APP_URL}/dashboard/bookings`;
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px;">New booking request</h1>
    <p style="font-size: 14px; color: #52525B;">
      ${booking.customerName} (${booking.customerPhone}) requested an appointment for ${formatDateTime(booking.startTime)} at ${formatTime(booking.startTime)}.
    </p>
    <div style="margin: 16px 0;">
      ${servicesSummaryHtml(booking)}
    </div>
    <p style="margin: 20px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        Open dashboard
      </a>
    </p>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendNewBookingNotification");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: recipientEmails,
    subject: `New booking request from ${booking.customerName}`,
    html: emailShell(vendor.name, body),
  });
}
