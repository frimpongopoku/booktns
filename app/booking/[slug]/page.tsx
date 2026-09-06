import type { Metadata } from "next";
import Link from "next/link";
import PlatformCredit from "@/components/shared/PlatformCredit";
import { notFound } from "next/navigation";
import { getBookingBySlug } from "@/lib/bookings";
import { formatPrice } from "@/lib/data";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { bookingStatusBadge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import BookingConfirmationActions from "@/components/storefront/BookingConfirmationActions";
import VendorContactCard from "@/components/storefront/VendorContactCard";
import VendorWordmark from "@/components/storefront/VendorWordmark";
import StartYourOwnShopLink from "@/components/shared/StartYourOwnShopLink";
import { buildVendorContactMeta } from "@/lib/vendor-contact";
import {
  CheckCircle2,
  Clock,
  Calendar,
  User,
  MapPin,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const booking = await getBookingBySlug(slug);
  if (!booking) {
    return {
      title: "Booking Confirmation",
      alternates: { canonical: `/booking/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  const servicesLabel = booking.services.map((s) => s.name).join(" + ");
  const description = `${servicesLabel} · ${formatDateTime(booking.startTime)} at ${booking.vendor.name}`;

  return {
    title: `Booking Confirmation — ${booking.vendor.name}`,
    description,
    alternates: { canonical: `/booking/${slug}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: `Booking at ${booking.vendor.name}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Booking at ${booking.vendor.name}`,
      description,
    },
  };
}

export default async function BookingConfirmationPage({ params }: PageProps) {
  const { slug } = await params;

  const booking = await getBookingBySlug(slug);
  if (!booking) notFound();

  const isPending = booking.status === "pending";
  const staffName = booking.assignedStaffName ?? booking.staffPreferenceName;

  const contact = buildVendorContactMeta(booking.vendor);

  const whatsappMessage = `Hi ${booking.vendor.name}, I'd like to confirm my booking reference ${booking.slug}. Customer: ${booking.customerName}.`;

  const servicesTotal = booking.services.reduce((s, svc) => s + svc.priceAtBooking, 0);

  const calendarUrl = buildGoogleCalendarUrl({
    title: booking.services.map((s) => s.name).join(" + "),
    startTime: booking.startTime,
    endTime: booking.endTime,
    details: `Booking at ${booking.vendor.name}`,
    location: booking.vendor.location,
  });

  return (
    // data-storefront-theme scopes the vendor's chosen accent colour, the
    // same mechanism app/[slug]/layout.tsx applies to the storefront itself.
    // This page sits outside that route group, so it had no wrapper and
    // always rendered in the default red regardless of the vendor's theme —
    // jarring right after a storefront in, say, Emerald.
    <div
      data-storefront-theme={booking.vendor.storefrontTheme}
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Header */}
      {/* The vendor's own identity, not the Booktns wordmark — this page is
          the customer's record of a booking with *them*. */}
      <div
        className="px-4 py-4 flex items-center justify-center"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        <VendorWordmark
          name={booking.vendor.name}
          href={`/${booking.vendor.slug}`}
          logoUrl={booking.vendor.logoUrl}
        />
      </div>

      <div className="max-w-lg md:max-w-3xl mx-auto px-4 py-8">
        {/* Status */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 anim-pop"
            style={{ background: isPending ? "var(--amber-bg)" : "var(--green-bg)" }}
          >
            <CheckCircle2 size={32} style={{ color: isPending ? "var(--amber)" : "var(--green)" }} />
          </div>
          <div className="mb-3 anim-fade-up anim-d1">{bookingStatusBadge(booking.status)}</div>
          <h1
            className="font-display text-2xl font-medium anim-fade-up anim-d2"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            {booking.slug}
          </h1>
          {isPending && (
            <p className="text-base mt-2 anim-fade-up anim-d2" style={{ color: "var(--tx3)" }}>
              {booking.vendor.name} will confirm your booking via WhatsApp.
            </p>
          )}
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-6">
          <div className="flex flex-col gap-4">
            {/* Customer */}
            <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                Customer
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base font-semibold text-white"
                  style={{ background: "var(--ac)" }}
                >
                  {booking.customerName[0]}
                </div>
                <div>
                  <p className="text-base font-semibold" style={{ color: "var(--tx)" }}>{booking.customerName}</p>
                  <p className="text-sm" style={{ color: "var(--tx3)" }}>{booking.customerPhone}</p>
                  <p className="text-sm" style={{ color: "var(--tx3)" }}>{booking.customerEmail}</p>
                </div>
              </div>
              {booking.notes && (
                <p className="text-sm mt-3 pt-3" style={{ color: "var(--tx3)", borderTop: "1px solid var(--bds)" }}>
                  {booking.notes}
                </p>
              )}
            </div>

            {/* Services */}
            <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                Services
              </p>
              <div className="flex flex-col gap-2">
                {booking.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-base" style={{ color: "var(--tx)" }}>{s.name}</span>
                    <span className="text-base font-medium" style={{ color: "var(--tx2)" }}>
                      {formatPrice(s.priceAtBooking)}
                    </span>
                  </div>
                ))}
                <div
                  className="flex items-center justify-between pt-2 mt-1"
                  style={{ borderTop: "1px solid var(--bds)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--tx3)" }}>Total</span>
                  <span className="font-display text-lg font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}>
                    {formatPrice(servicesTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Products */}
            {booking.products.length > 0 && (
              <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                  Products flagged
                </p>
                <div className="flex flex-col gap-2">
                  {booking.products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-base" style={{ color: "var(--tx)" }}>{p.name} × {p.quantity}</span>
                      <span className="text-base font-medium" style={{ color: "var(--tx2)" }}>
                        {formatPrice(p.priceAtBooking * p.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 mt-4 md:mt-0">
            {/* Appointment details */}
            <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
                Appointment
              </p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Calendar size={15} style={{ color: "var(--tx3)" }} />
                  <span className="text-base" style={{ color: "var(--tx)" }}>{formatDateTime(booking.startTime)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={15} style={{ color: "var(--tx3)" }} />
                  <span className="text-base" style={{ color: "var(--tx)" }}>
                    {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                  </span>
                </div>
                {staffName && (
                  <div className="flex items-center gap-2.5">
                    <User size={15} style={{ color: "var(--tx3)" }} />
                    <span className="text-base" style={{ color: "var(--tx)" }}>{staffName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <MapPin size={15} style={{ color: "var(--tx3)" }} />
                  <span className="text-base" style={{ color: "var(--tx2)" }}>{booking.vendor.location}</span>
                </div>
              </div>
            </div>

            {/* Deposit info */}
            {booking.depositAmountPesewas > 0 && (
              <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--amber-bg)", border: "1px solid var(--amber)" }}>
                <p className="text-base font-semibold mb-1" style={{ color: "var(--amber)" }}>
                  Deposit required
                </p>
                <p className="text-base" style={{ color: "var(--amber)" }}>
                  Please pay a deposit of{" "}
                  <span className="font-bold">{formatPrice(booking.depositAmountPesewas)}</span>{" "}
                  to confirm your booking.
                </p>
                {booking.depositReferenceCode && (
                  <p className="text-base mt-1" style={{ color: "var(--amber)" }}>
                    Include reference <span className="font-bold">{booking.depositReferenceCode}</span> in your payment description.
                  </p>
                )}
                {booking.paymentMethod ? (
                  <div className="mt-3 p-3 rounded-[var(--r)]" style={{ background: "var(--bg)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--tx3)" }}>{booking.paymentMethod.label}</p>
                        <p className="text-base font-medium" style={{ color: "var(--tx)" }}>{booking.paymentMethod.accountName}</p>
                        {booking.paymentMethod.accountNumber && (
                          <p className="text-base font-bold tracking-wider" style={{ color: "var(--tx)" }}>{booking.paymentMethod.accountNumber}</p>
                        )}
                      </div>
                      {booking.paymentMethod.accountNumber && <CopyButton text={booking.paymentMethod.accountNumber} />}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/${booking.vendor.slug}/pay`}
                    className="inline-flex items-center gap-1.5 mt-3 text-base font-medium"
                    style={{ color: "var(--amber)" }}
                  >
                    View payment details →
                  </Link>
                )}
              </div>
            )}

            {/* Cancellation policy */}
            {booking.vendor.cancellationPolicy && (
              <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
                  Cancellation policy
                </p>
                <p className="text-base" style={{ color: "var(--tx2)" }}>{booking.vendor.cancellationPolicy}</p>
              </div>
            )}

            {/* Every way of reaching the vendor, anchored at #contact so the
                booking emails' "reach out to them directly" can link
                straight here — the customer has no account, so this page and
                that email are the only things they keep. */}
            <VendorContactCard id="contact" contact={contact} whatsappMessage={whatsappMessage} bookingSlug={booking.slug} />

            <BookingConfirmationActions
              slug={booking.slug}
              status={booking.status}
              vendorName={booking.vendor.name}
              customerName={booking.customerName}
              customerPhone={booking.customerPhone}
              customerEmail={booking.customerEmail}
              calendarUrl={calendarUrl}
              confirmedPdfUrl={booking.confirmedPdfUrl}
            />
          </div>
        </div>

        <div className="text-center pt-6">
          <Link
            href={`/${booking.vendor.slug}`}
            className="text-base"
            style={{ color: "var(--tx3)" }}
          >
            ← Back to {booking.vendor.name}
          </Link>
        </div>

        {/* The shop's QR, for the conversation this page tends to start —
            someone asks where you had it done and you show them your phone.
            Scanning goes straight to the booking flow, so a recommendation
            turns into a booking without anyone typing a URL.

            Only when the storefront is published: /api/qr 404s otherwise,
            which would render as a broken image. */}
        {booking.vendor.storefrontPublished && (
          <div
            className="mt-8 p-4 rounded-[var(--rl)] flex items-center gap-4"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <a
              href={`/api/qr/${booking.vendor.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-24 flex-shrink-0 rounded-[var(--r)] overflow-hidden"
              style={{ border: "1px solid var(--bds)", background: "#fff" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${booking.vendor.slug}`}
                alt={`QR code to book at ${booking.vendor.name}`}
                className="w-full h-auto block"
                loading="lazy"
              />
            </a>
            <div className="min-w-0">
              <p className="text-base font-medium" style={{ color: "var(--tx)" }}>
                Recommending {booking.vendor.name}?
              </p>
              <p className="text-sm mt-0.5" style={{ color: "var(--tx3)" }}>
                Show them this code — it opens the booking page straight away. Tap it to save or
                share the full poster.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer
        className="mt-auto px-4 py-6 flex flex-col items-center gap-3 text-center"
        style={{ borderTop: "1px solid var(--bds)" }}
      >
        <StartYourOwnShopLink variant="card" className="w-full max-w-sm" />
        <Link href="/" className="text-sm" style={{ color: "var(--tx3)" }}>
          Powered by{" "}
          <span className="font-medium" style={{ color: "var(--ac)" }}>Booktns</span>
        </Link>
        <PlatformCredit className="justify-center" />
      </footer>
    </div>
  );
}
