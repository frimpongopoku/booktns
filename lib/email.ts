import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";
import type { Booking } from "@/types";
import { formatPrice } from "@/lib/data";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { whatsappLink } from "@/lib/vendor-contact";
import { getFeedbackInboxEmail } from "@/lib/feedback";

// Only what these templates actually reference — avoids requiring a full
// Vendor row (with every settings field) just to send an email. Expanded
// beyond the original {name, cancellationPolicy} so every email can lead
// with the vendor's own identity and give the customer a direct way back
// to them — there's no customer account, so this email IS their record.
interface VendorEmailInfo {
  name: string;
  slug: string;
  logoUrl?: string | null;
  location: string;
  whatsapp: string;
  personalWhatsappNumber?: string | null;
  cancellationPolicy?: string | null;
  // Optional so a caller that hasn't been updated still sends a valid email
  // — these only ever add a row to the contact block. `phone` is the shop's
  // published line; `ownerEmail` must already have been checked against the
  // vendor's showOwnerEmail flag by the caller.
  phone?: string | null;
  ownerEmail?: string | null;
}

// Fallback only — the real value should come from EMAIL_FROM and must be on
// a domain actually verified in Resend (Resend rejects sends from any other
// domain with a 403, even a subdomain of one you do own). This default
// matches the subdomain verified for this project; if that ever changes,
// update EMAIL_FROM in .env rather than relying on this fallback.
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Booktns <bookings@notifications.booktns.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2665";

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

// Vendor-first shell — logo/name lead every email (not the Booktns wordmark),
// and a standing contact block gives the customer a way to reach the vendor
// or revisit their storefront without ever needing an account. showContact
// is turned off for the one email that goes TO the vendor themselves
// (sendNewBookingNotification) — "Message {yourself}" would just look broken.
function emailShell(vendor: VendorEmailInfo, bodyHtml: string, showContact = true): string {
  const storefrontUrl = `${APP_URL}/${vendor.slug}`;

  // Phone and email are rendered as their actual values rather than as a
  // "Contact us" label — an email client's plain-text fallback, a forwarded
  // screenshot, or a printed copy all still carry the number that way.
  const extraChannels = [
    vendor.phone ? `<a href="tel:${vendor.phone}" style="color: #C0283A; text-decoration: none;">${vendor.phone}</a>` : "",
    vendor.ownerEmail ? `<a href="mailto:${vendor.ownerEmail}" style="color: #C0283A; text-decoration: none;">${vendor.ownerEmail}</a>` : "",
  ].filter(Boolean).join('<span style="color: #D4D4D8;"> &middot; </span>');

  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181B;">
      <div style="padding: 24px 0; text-align: center; border-bottom: 1px solid #E4E4E7;">
        ${
          vendor.logoUrl
            ? `<img src="${vendor.logoUrl}" alt="${vendor.name}" width="40" height="40" style="border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 8px;" />`
            : ""
        }
        <a href="${storefrontUrl}" style="font-size: 18px; font-weight: 600; color: #18181B; text-decoration: none;">${vendor.name}</a>
      </div>
      <div style="padding: 24px 4px;">
        ${bodyHtml}
      </div>
      ${
        showContact
          ? `
      <div style="padding: 14px 16px; margin-top: 8px; background: #FAFAFA; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #52525B;">${vendor.location}</p>
        <p style="margin: 0 0 6px; font-size: 13px;">
          <a href="${whatsappLink(vendor.personalWhatsappNumber ?? vendor.whatsapp)}" style="color: #C0283A; text-decoration: none; font-weight: 500;">Message ${vendor.name}</a>
          <span style="color: #D4D4D8;"> &middot; </span>
          <a href="${storefrontUrl}" style="color: #C0283A; text-decoration: none; font-weight: 500;">Visit storefront</a>
        </p>
        ${extraChannels ? `<p style="margin: 0; font-size: 13px;">${extraChannels}</p>` : ""}
      </div>`
          : ""
      }
      <div style="padding: 16px 0; text-align: center; color: #A1A1AA; font-size: 11px;">
        Powered by <span style="color: #C0283A; font-weight: 600;">Book</span>tns
      </div>
    </div>
  `;
}

// Services + any flagged products in one table, products linking to their
// shop page (when the product still exists — productSlug is undefined if
// it's since been deleted), ending in a real grand total — previously this
// only listed services with no total at all and never mentioned products.
function orderSummaryHtml(booking: Booking, vendorSlug: string): string {
  const serviceRows = booking.services
    .map(
      (s) =>
        `<tr><td style="padding: 4px 0; font-size: 14px;">${s.name}</td><td style="padding: 4px 0; font-size: 14px; text-align: right;">${formatPrice(s.priceAtBooking)}</td></tr>`
    )
    .join("");

  const productRows = booking.products
    .map((p) => {
      const label = p.productSlug
        ? `<a href="${APP_URL}/${vendorSlug}/shop/${p.productSlug}" style="color: #C0283A; text-decoration: none;">${p.name}</a> &times; ${p.quantity}`
        : `${p.name} &times; ${p.quantity}`;
      return `<tr><td style="padding: 4px 0; font-size: 14px;">${label}</td><td style="padding: 4px 0; font-size: 14px; text-align: right;">${formatPrice(p.priceAtBooking * p.quantity)}</td></tr>`;
    })
    .join("");

  const total =
    booking.services.reduce((sum, s) => sum + s.priceAtBooking, 0) +
    booking.products.reduce((sum, p) => sum + p.priceAtBooking * p.quantity, 0);

  return `
    <table style="width: 100%; border-collapse: collapse;">
      ${serviceRows}
      ${productRows}
      <tr>
        <td style="padding: 8px 0 0; font-size: 13px; font-weight: 600; color: #71717A; border-top: 1px solid #E4E4E7;">Total</td>
        <td style="padding: 8px 0 0; font-size: 15px; font-weight: 700; text-align: right; border-top: 1px solid #E4E4E7;">${formatPrice(total)}</td>
      </tr>
    </table>
  `;
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

// Outline-style secondary button, sitting under the primary CTA — only used
// on the confirmed/rescheduled emails, where the appointment time is
// actually settled and worth putting on a calendar.
function addToCalendarButtonHtml(booking: Booking, vendor: VendorEmailInfo): string {
  const calendarUrl = buildGoogleCalendarUrl({
    title: booking.services.map((s) => s.name).join(" + "),
    startTime: booking.startTime,
    endTime: booking.endTime,
    details: `Booking at ${vendor.name}`,
    location: vendor.location,
  });
  return `
    <p style="margin: 0 0 20px;">
      <a href="${calendarUrl}" style="display: inline-block; padding: 8px 16px; background: transparent; border: 1px solid #C0283A; color: #C0283A; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">
        + Add to calendar
      </a>
    </p>
  `;
}

// "Reach out to them directly" is useless on its own — a customer has no
// account and nowhere to look the vendor up. Every one of those sentences
// links to the #contact block on the customer's own booking/order page,
// which lists WhatsApp, phone, email, address and hours.
function contactLinkHtml(vendor: VendorEmailInfo, recordUrl: string, label?: string): string {
  return `<a href="${recordUrl}#contact" style="color: #C0283A; font-weight: 500;">${label ?? `reach out to ${vendor.name}`}</a>`;
}

function cancellationPolicyHtml(vendor: VendorEmailInfo): string {
  if (!vendor.cancellationPolicy) return "";
  return `
    <div style="margin-top: 16px;">
      <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #A1A1AA; margin: 0 0 4px;">Cancellation policy</p>
      <p style="font-size: 13px; color: #71717A; margin: 0;">${vendor.cancellationPolicy}</p>
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
      <p style="font-size: 13px; color: #71717A; margin: 0 0 8px;">${formatDateTime(booking.startTime)} &middot; ${formatTime(booking.startTime)}</p>
      ${orderSummaryHtml(booking, vendor.slug)}
    </div>
    ${depositBlockHtml(booking, vendor)}
    ${cancellationPolicyHtml(vendor)}
    <p style="font-size: 13px; color: #71717A; margin-top: 16px;">
      You can cancel or edit your details from that page until ${vendor.name} confirms — after that, please ${contactLinkHtml(vendor, bookingUrl, "get in touch with them")}.
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
    html: emailShell(vendor, body),
  });
}

export async function sendBookingConfirmedEmail(booking: Booking, vendor: VendorEmailInfo): Promise<void> {
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px; color: #15803D;">Your booking is confirmed</h1>
    <p style="font-size: 14px; color: #52525B;">
      ${vendor.name} has confirmed your appointment for ${formatDateTime(booking.startTime)} at ${formatTime(booking.startTime)}.
    </p>
    <p style="margin: 20px 0 12px;">
      <a href="${bookingUrl}" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        View booking &amp; download PDF
      </a>
    </p>
    ${addToCalendarButtonHtml(booking, vendor)}
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4E4E7;">
      ${orderSummaryHtml(booking, vendor.slug)}
    </div>
    ${depositBlockHtml(booking, vendor)}
    ${cancellationPolicyHtml(vendor)}
    <p style="font-size: 13px; color: #71717A; margin-top: 16px;">
      Need to change or cancel? ${contactLinkHtml(vendor, bookingUrl, `Get in touch with ${vendor.name}`)} — confirmed bookings can no longer be edited from this page.
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
    html: emailShell(vendor, body),
  });
}

export async function sendBookingCancelledEmail(booking: Booking, vendor: VendorEmailInfo): Promise<void> {
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px; color: #B91C1C;">Your booking has been cancelled</h1>
    <p style="font-size: 14px; color: #52525B;">
      Your appointment with ${vendor.name} for ${formatDateTime(booking.startTime)} at ${formatTime(booking.startTime)} has been cancelled.
    </p>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4E4E7;">
      ${orderSummaryHtml(booking, vendor.slug)}
    </div>
    ${cancellationPolicyHtml(vendor)}
    <p style="margin: 20px 0;">
      <a href="${APP_URL}/${vendor.slug}/book" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        Book again
      </a>
    </p>
    <p style="font-size: 13px; color: #71717A;">
      Questions about this cancellation? <a href="${bookingUrl}" style="color: #C0283A;">View the booking</a> or ${contactLinkHtml(vendor, bookingUrl)}.
    </p>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendBookingCancelledEmail");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: booking.customerEmail,
    subject: `Booking cancelled — ${vendor.name}`,
    html: emailShell(vendor, body),
  });
}

export async function sendBookingCompletedEmail(booking: Booking, vendor: VendorEmailInfo): Promise<void> {
  const serviceNames = booking.services.map((s) => s.name).join(", ");
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px; color: #15803D;">Thank you for visiting ${vendor.name}!</h1>
    <p style="font-size: 14px; color: #52525B;">
      We hope you loved your ${serviceNames || "appointment"}. Thanks so much for choosing ${vendor.name} — we'd love to see you again soon.
    </p>
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4E4E7;">
      <p style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #A1A1AA; margin: 0 0 8px;">You came in for</p>
      ${orderSummaryHtml(booking, vendor.slug)}
    </div>
    <p style="margin: 20px 0;">
      <a href="${APP_URL}/${vendor.slug}/book" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        Book your next appointment
      </a>
    </p>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendBookingCompletedEmail");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: booking.customerEmail,
    subject: `Thank you for visiting ${vendor.name}!`,
    html: emailShell(vendor, body),
  });
}

export async function sendBookingRescheduledEmail(booking: Booking, vendor: VendorEmailInfo): Promise<void> {
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const body = `
    <h1 style="font-size: 18px; margin: 0 0 12px;">Your booking has been rescheduled</h1>
    <p style="font-size: 14px; color: #52525B;">
      ${vendor.name} moved your appointment to <strong>${formatDateTime(booking.startTime)} at ${formatTime(booking.startTime)}</strong>.
    </p>
    <p style="margin: 20px 0 12px;">
      <a href="${bookingUrl}" style="display: inline-block; padding: 10px 20px; background: #C0283A; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
        View updated booking
      </a>
    </p>
    ${addToCalendarButtonHtml(booking, vendor)}
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E4E4E7;">
      ${orderSummaryHtml(booking, vendor.slug)}
    </div>
    ${depositBlockHtml(booking, vendor)}
    <p style="font-size: 13px; color: #71717A; margin-top: 16px;">
      This time doesn't work? ${contactLinkHtml(vendor, bookingUrl, `Get in touch with ${vendor.name}`)} to find another slot.
    </p>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendBookingRescheduledEmail");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: booking.customerEmail,
    subject: `Booking rescheduled — ${vendor.name}`,
    html: emailShell(vendor, body),
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
      ${orderSummaryHtml(booking, vendor.slug)}
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
    html: emailShell(vendor, body, /* showContact */ false),
  });
}

// A vendor's staff reaching the Booktns platform team, not a customer-facing
// send — deliberately doesn't use emailShell (that's vendor-branded).
export async function sendSupportMessageNotification(params: {
  vendorName: string;
  staffName: string;
  staffEmail: string;
  subject: string;
  message: string;
}): Promise<void> {
  // Shares the feedback button's fallback: a vendor writing in for help
  // should reach a human whether or not SUPPORT_INBOX_EMAIL is configured.
  // This used to return early and silently drop the message.
  const supportInboxEmail = getFeedbackInboxEmail();

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181B;">
      <h1 style="font-size: 18px; margin: 0 0 12px;">Support request from ${params.vendorName}</h1>
      <p style="font-size: 14px; color: #52525B; margin: 0 0 16px;">
        From ${params.staffName} (${params.staffEmail})
      </p>
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">${params.subject}</p>
      <p style="font-size: 14px; white-space: pre-wrap;">${params.message}</p>
    </div>
  `;

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendSupportMessageNotification");
    return;
  }
  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: supportInboxEmail,
    replyTo: params.staffEmail,
    subject: `[Support] ${params.vendorName}: ${params.subject}`,
    html,
  });
}

// --- Verification -----------------------------------------------------------
//
// These go to a vendor about their own platform account rather than about a
// booking, so they use a plain shell rather than the vendor-branded one — the
// sender here is Booktns, not the vendor's own business.

function platformShell(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #18181B;">
      ${bodyHtml}
      <p style="font-size: 12px; color: #A1A1AA; margin-top: 28px; border-top: 1px solid #E4E4E7; padding-top: 16px;">
        Booktns · Made for shops across Ghana · Built by the Biibisoft Team
      </p>
    </div>
  `;
}

export async function sendVerificationApprovedEmail(params: {
  to: string;
  legalName: string;
  vendorNames: string[];
}): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendVerificationApprovedEmail");
    return;
  }

  // Lists every shop that just became verified — a vendor running several
  // needs to know the badge applies to all of them, not just the one they
  // happened to apply from.
  const shopList = params.vendorNames.map((name) => `<li style="margin-bottom:4px;">${name}</li>`).join("");

  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: params.to,
    subject: "You're verified on Booktns",
    html: platformShell(`
      <h1 style="font-size: 20px; margin: 0 0 12px;">You're verified</h1>
      <p style="font-size: 14px; color: #52525B; margin: 0 0 16px;">
        Hi ${params.legalName}, we've checked your ID and your Booktns account is now verified.
        A Verified badge now shows on:
      </p>
      <ul style="font-size: 14px; color: #18181B; padding-left: 20px; margin: 0 0 16px;">${shopList}</ul>
      <p style="font-size: 14px; color: #52525B; margin: 0;">
        Customers see this badge on your storefront and on your payment page, where it replaces the
        warning we otherwise show about paying an unverified vendor.
      </p>
    `),
  });
}

export async function sendVerificationRejectedEmail(params: {
  to: string;
  legalName: string;
  reason: string;
}): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendVerificationRejectedEmail");
    return;
  }

  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: params.to,
    subject: "We couldn't verify your Booktns account yet",
    html: platformShell(`
      <h1 style="font-size: 20px; margin: 0 0 12px;">We couldn't verify your account yet</h1>
      <p style="font-size: 14px; color: #52525B; margin: 0 0 16px;">
        Hi ${params.legalName}, we reviewed your verification and couldn't approve it this time.
      </p>
      <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px;">Why</p>
      <p style="font-size: 14px; color: #18181B; margin: 0 0 20px; white-space: pre-wrap;">${params.reason}</p>
      <p style="font-size: 14px; color: #52525B; margin: 0;">
        You can fix this and submit again any time from Settings → Verification in your dashboard.
        Nothing else about your account has changed.
      </p>
    `),
  });
}

export async function sendSuperAdminInviteEmail(params: { to: string; invitedBy: string }): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendSuperAdminInviteEmail");
    return;
  }

  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: params.to,
    subject: "You've been given Booktns platform admin access",
    html: platformShell(`
      <h1 style="font-size: 20px; margin: 0 0 12px;">Platform admin access</h1>
      <p style="font-size: 14px; color: #52525B; margin: 0 0 16px;">
        ${params.invitedBy} has given this email address administrator access to the Booktns platform console.
      </p>
      <p style="font-size: 14px; color: #52525B; margin: 0 0 16px;">
        Sign in at <a href="${APP_URL}/superadmin/login" style="color:#C0283A;">${APP_URL}/superadmin/login</a>
        using this exact Google account. There's no password and no sign-up — access is tied to this address.
      </p>
      <p style="font-size: 14px; color: #52525B; margin: 0;">
        If you weren't expecting this, you can ignore it and no account will be created for you.
      </p>
    `),
  });
}

// Product feedback from anyone — vendor staff, a shopper on a storefront, a
// visitor to the landing page. Plain platform shell rather than the
// vendor-branded one: the recipient is us, not a customer.
export async function sendFeedbackNotification(params: {
  to: string;
  message: string;
  source: string;
  path?: string;
  replyTo?: string;
  staffName?: string;
  vendorName?: string;
}): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping sendFeedbackNotification");
    return;
  }

  const senderLine = params.staffName
    ? `${params.staffName}${params.vendorName ? ` at ${params.vendorName}` : ""}${params.replyTo ? ` (${params.replyTo})` : ""}`
    : params.replyTo
      ? params.replyTo
      : "Anonymous visitor";

  await sendOrThrow(client, {
    from: EMAIL_FROM,
    to: params.to,
    // Only set when we actually have an address — Resend rejects an empty
    // replyTo, which would turn a working send into a thrown error.
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    subject: `[Feedback · ${params.source}] ${params.message.slice(0, 60)}${params.message.length > 60 ? "…" : ""}`,
    html: platformShell(`
      <h1 style="font-size: 18px; margin: 0 0 12px;">New feedback</h1>
      <p style="font-size: 13px; color: #71717A; margin: 0 0 4px;">From ${senderLine}</p>
      <p style="font-size: 13px; color: #71717A; margin: 0 0 16px;">
        Sent from the ${params.source}${params.path ? ` · <code>${params.path}</code>` : ""}
      </p>
      <p style="font-size: 14px; white-space: pre-wrap; margin: 0;">${params.message}</p>
    `),
  });
}
