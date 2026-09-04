import africastalking from "africastalking";
import type { SMS as AfricasTalkingSms, SMSOptions } from "africastalking";
import type { Booking } from "../../types";

// Only what these messages actually reference — mirrors lib/email.ts's
// VendorEmailInfo shape/reasoning.
interface VendorSmsInfo {
  name: string;
}

const AT_API_KEY = process.env.AFRICAS_TALKING_API_KEY;
const AT_USERNAME = process.env.AFRICAS_TALKING_USERNAME;
// Alphanumeric Sender ID registered with Ghana's NCA. Optional — without it
// Africa's Talking sends from a shared/generic ID, which is fine for testing
// but should be set before relying on this in production.
const AT_SENDER_ID = process.env.AFRICAS_TALKING_SENDER_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2665";

// Built lazily, same reasoning as lib/email.ts's getResendClient — importing
// this module must never crash the booking flow before the env vars are set.
let smsClient: AfricasTalkingSms | null = null;
function getSmsClient(): AfricasTalkingSms | null {
  if (!AT_API_KEY || !AT_USERNAME) return null;
  if (!smsClient) smsClient = africastalking({ apiKey: AT_API_KEY, username: AT_USERNAME }).SMS;
  return smsClient;
}

// Africa's Talking resolves with a 200 + per-recipient status even when a
// message actually failed to send (bad number, insufficient balance, etc.) —
// awaiting client.send() directly would silently treat that as success, the
// same trap lib/email.ts's sendOrThrow guards against for Resend.
//
// Note what "Success" here actually means: the API accepted the message for
// delivery, not that it reached the handset. A Sender ID pending NCA
// approval, or a number on Ghana's DND registry, can both get silently
// dropped downstream after this call reports Success — cross-check the
// messageId below against Africa's Talking's own delivery reports if a
// message logs as sent but never arrives.
async function sendOrThrowSms(client: AfricasTalkingSms, options: SMSOptions): Promise<void> {
  const response = await client.send(options);
  console.log("Africa's Talking SMS response:", JSON.stringify(response.SMSMessageData.Recipients));
  const failed = response.SMSMessageData.Recipients.filter((r) => r.status !== "Success");
  if (failed.length > 0) {
    const detail = failed.map((r) => `${r.number}: ${r.status}`).join(", ");
    throw new Error(`Africa's Talking SMS failed for ${failed.length} recipient(s): ${detail}`);
  }
}

function formatCompactDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-NG", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
  return `${date}, ${time}`;
}

export async function sendBookingRequestSms(booking: Booking, vendor: VendorSmsInfo): Promise<void> {
  const client = getSmsClient();
  if (!client) {
    console.warn("AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME not configured — skipping sendBookingRequestSms");
    return;
  }
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const message = `Booktns: Your booking request with ${vendor.name} for ${formatCompactDateTime(booking.startTime)} has been received. We'll confirm shortly. ${bookingUrl}`;
  await sendOrThrowSms(client, { to: booking.customerPhone, message, ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}) });
}

export async function sendBookingConfirmedSms(booking: Booking, vendor: VendorSmsInfo): Promise<void> {
  const client = getSmsClient();
  if (!client) {
    console.warn("AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME not configured — skipping sendBookingConfirmedSms");
    return;
  }
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const message = `Booktns: Your booking with ${vendor.name} on ${formatCompactDateTime(booking.startTime)} is confirmed. ${bookingUrl}`;
  await sendOrThrowSms(client, { to: booking.customerPhone, message, ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}) });
}

export async function sendBookingCancelledSms(booking: Booking, vendor: VendorSmsInfo): Promise<void> {
  const client = getSmsClient();
  if (!client) {
    console.warn("AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME not configured — skipping sendBookingCancelledSms");
    return;
  }
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const message = `Booktns: Your booking with ${vendor.name} on ${formatCompactDateTime(booking.startTime)} has been cancelled. ${bookingUrl}`;
  await sendOrThrowSms(client, { to: booking.customerPhone, message, ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}) });
}

export async function sendBookingCompletedSms(booking: Booking, vendor: VendorSmsInfo): Promise<void> {
  const client = getSmsClient();
  if (!client) {
    console.warn("AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME not configured — skipping sendBookingCompletedSms");
    return;
  }
  const message = `Booktns: Thank you for visiting ${vendor.name}! We hope to see you again soon.`;
  await sendOrThrowSms(client, { to: booking.customerPhone, message, ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}) });
}

export async function sendBookingRescheduledSms(booking: Booking, vendor: VendorSmsInfo): Promise<void> {
  const client = getSmsClient();
  if (!client) {
    console.warn("AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME not configured — skipping sendBookingRescheduledSms");
    return;
  }
  const bookingUrl = `${APP_URL}/booking/${booking.slug}`;
  const message = `Booktns: ${vendor.name} moved your booking to ${formatCompactDateTime(booking.startTime)}. ${bookingUrl}`;
  await sendOrThrowSms(client, { to: booking.customerPhone, message, ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}) });
}

export async function sendNewBookingSms(booking: Booking, recipientPhones: string[]): Promise<void> {
  if (recipientPhones.length === 0) return;
  const client = getSmsClient();
  if (!client) {
    console.warn("AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME not configured — skipping sendNewBookingSms");
    return;
  }
  const dashboardUrl = `${APP_URL}/dashboard/bookings`;
  const message = `Booktns: New booking request from ${booking.customerName} for ${formatCompactDateTime(booking.startTime)}. ${dashboardUrl}`;
  await sendOrThrowSms(client, { to: recipientPhones, message, ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}) });
}
