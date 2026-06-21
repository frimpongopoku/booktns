import Link from "next/link";
import { bookings, vendor, paymentMethods, formatPrice } from "@/lib/data";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  CheckCircle2,
  Clock,
  Calendar,
  User,
  MapPin,
  Download,
  MessageCircle,
  CalendarPlus,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default async function BookingConfirmationPage({ params }: PageProps) {
  const { slug } = await params;

  // Find booking by slug, default to first booking for demo
  const booking = bookings.find((b) => b.slug === slug) ?? bookings[3];
  const isPending = booking.status === "pending";

  const whatsappMsg = encodeURIComponent(
    `Hi ${vendor.name}, I'd like to confirm my booking reference ${booking.slug.toUpperCase()}. Customer: ${booking.customerName}.`
  );

  const calStartDate = new Date(booking.startTime);
  const calEndDate = new Date(booking.endTime);
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    booking.services.map((s) => s.name).join(" + ")
  )}&dates=${calStartDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${calEndDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z&details=Booking+at+${encodeURIComponent(vendor.name)}&location=${encodeURIComponent(vendor.location)}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center justify-center"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        <Link
          href="/"
          className="font-display text-lg font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          <span style={{ color: "var(--ac)" }}>Book</span>tns
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Status */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: isPending ? "var(--amber-bg)" : "var(--green-bg)",
            }}
          >
            <CheckCircle2
              size={32}
              style={{ color: isPending ? "var(--amber)" : "var(--green)" }}
            />
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3"
            style={{
              background: isPending ? "var(--amber-bg)" : "var(--green-bg)",
              color: isPending ? "var(--amber)" : "var(--green)",
            }}
          >
            {isPending ? "⏳ Awaiting Confirmation" : "✓ Confirmed"}
          </div>
          <h1
            className="font-display text-2xl font-medium"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            {booking.slug.toUpperCase()}
          </h1>
          {isPending && (
            <p className="text-sm mt-2" style={{ color: "var(--tx3)" }}>
              {vendor.name} will confirm your booking via WhatsApp.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Customer */}
          <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
              Customer
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                style={{ background: "var(--ac)" }}
              >
                {booking.customerName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{booking.customerName}</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>{booking.customerPhone}</p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
              Services
            </p>
            <div className="flex flex-col gap-2">
              {booking.services.map((s) => (
                <div key={s.serviceId} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--tx)" }}>{s.name}</span>
                  <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>
                    {formatPrice(s.priceAtBooking)}
                  </span>
                </div>
              ))}
              <div
                className="flex items-center justify-between pt-2 mt-1"
                style={{ borderTop: "1px solid var(--bds)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--tx3)" }}>Total</span>
                <span className="font-display text-lg font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}>
                  {formatPrice(booking.services.reduce((s, svc) => s + svc.priceAtBooking, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Appointment details */}
          <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
              Appointment
            </p>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <Calendar size={15} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx)" }}>{formatDateTime(booking.startTime)}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={15} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx)" }}>
                  {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                </span>
              </div>
              {booking.staffName && (
                <div className="flex items-center gap-2.5">
                  <User size={15} style={{ color: "var(--tx3)" }} />
                  <span className="text-sm" style={{ color: "var(--tx)" }}>{booking.staffName}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <MapPin size={15} style={{ color: "var(--tx3)" }} />
                <span className="text-sm" style={{ color: "var(--tx2)" }}>{vendor.location}</span>
              </div>
            </div>
          </div>

          {/* Deposit info */}
          {booking.depositAmountPesewas > 0 && (
            <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--amber-bg)", border: "1px solid var(--amber)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--amber)" }}>
                Deposit required
              </p>
              <p className="text-sm" style={{ color: "var(--amber)" }}>
                Please pay a deposit of{" "}
                <span className="font-bold">{formatPrice(booking.depositAmountPesewas)}</span>{" "}
                to confirm your booking.
              </p>
              <Link
                href={`/${vendor.slug}/pay`}
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium"
                style={{ color: "var(--amber)" }}
              >
                View payment details →
              </Link>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-2">
            <a
              href="#"
              className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium text-white"
              style={{ background: "var(--ac)" }}
            >
              <Download size={15} />
              Download PDF
            </a>
            <a
              href={`https://wa.me/${vendor.whatsapp.replace("+", "")}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium"
              style={{ background: "var(--green-bg)", color: "var(--green)" }}
            >
              <MessageCircle size={15} />
              Message vendor on WhatsApp
            </a>
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium"
              style={{ background: "var(--bg2)", color: "var(--tx2)" }}
            >
              <CalendarPlus size={15} />
              Add to Calendar
            </a>
          </div>

          <div className="text-center pt-2">
            <Link
              href={`/${vendor.slug}`}
              className="text-sm"
              style={{ color: "var(--tx3)" }}
            >
              ← Back to {vendor.name}
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-center py-6" style={{ borderTop: "1px solid var(--bds)" }}>
        <Link href="/" className="text-xs" style={{ color: "var(--tx3)" }}>
          Powered by{" "}
          <span className="font-medium" style={{ color: "var(--ac)" }}>Booktns</span>
        </Link>
      </footer>
    </div>
  );
}
