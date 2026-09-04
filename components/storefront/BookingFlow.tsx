"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/data";
import { calculateDepositAmountPesewas } from "@/lib/deposit";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import type { Service, Product, Staff, PaymentMethod, DepositSetting } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import { storefrontHref } from "@/lib/storefront-links";
import { captureEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";

interface ApiErrorBody {
  error: string;
  code: string;
}

const STEPS = [
  "Services",
  "Staff",
  "Date & Time",
  "Products",
  "Your Details",
  "Confirm",
];

function generateCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

// "14:30" -> "2:30 PM" — the availability API deals in 24h "HH:mm" (so it can
// be sent straight back at submission time); this is purely for display.
function formatSlotLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Named so a funnel in PostHog reads as steps rather than as integers.
const BOOKING_STEP_NAMES = ["services", "staff", "date_time", "products", "details", "review"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

interface BookingFlowProps {
  slug: string;
  vendorName: string;
  vendorLogoUrl?: string;
  services: Service[];
  products: Product[];
  staff: Staff[];
  depositSetting: DepositSetting;
  depositValue?: number;
  cancellationPolicy?: string;
  paymentMethods: PaymentMethod[];
  isCustomDomain: boolean;
  // Services named by a shared booking link, already validated against this
  // vendor on the server (app/[slug]/book/page.tsx).
  initialServices: Service[];
  // For the footer — already redacted by lib/vendors.ts, so a field that
  // arrives undefined is one the vendor chose not to publish.
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  verified?: boolean;
}

export default function BookingFlow({
  slug,
  vendorName,
  vendorLogoUrl,
  services,
  products,
  staff,
  depositSetting,
  depositValue,
  cancellationPolicy,
  paymentMethods,
  isCustomDomain,
  initialServices,
  ownerName,
  ownerPhone,
  ownerEmail,
  verified = false,
}: BookingFlowProps) {
  const router = useRouter();

  // A link that already names the service skips the service picker — that's
  // the whole point of sharing one. The Back button still returns to it, and
  // the summary sidebar shows what was chosen, so nothing is hidden.
  const [step, setStep] = useState(initialServices.length > 0 ? 1 : 0);

  // Step 1 — Services
  const [selectedServices, setSelectedServices] = useState<Service[]>(initialServices);

  // Step 2 — Staff
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Step 3 — Date & Time. Ghana is UTC+0 (matching the server-side assumption
  // in lib/availability.ts), so "today" is derived from UTC here rather than
  // the browser's local timezone — a customer browsing from outside UTC+0
  // would otherwise see a "today" out of sync with what the server actually
  // validates availability against.
  const now = new Date();
  const todayUTCStr = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  // One piece of state, not two. Stepping from January to December has to
  // change month and year together; as separate setState calls it was a pair
  // of updates that could render an impossible month/year combination in
  // between, which is what made the grid jump.
  const [cal, setCal] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  const { year: calYear, month: calMonth } = cal;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 4 — Products
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});

  // Step 5 — Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalServiceCost = selectedServices.reduce((s, svc) => s + svc.priceInPesewas, 0);
  const totalDurationMinutes = selectedServices.reduce((s, svc) => s + svc.durationMinutes, 0);
  const totalProductCost = Object.entries(productQtys).reduce((s, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return s + (p ? p.priceInPesewas * qty : 0);
  }, 0);
  const totalCost = totalServiceCost + totalProductCost;

  const depositAmountPesewas = calculateDepositAmountPesewas(depositSetting, depositValue, totalServiceCost);

  // Memoised: this rebuilt on every render, so typing a name or bumping a
  // product quantity re-created the whole day grid and made the calendar
  // visibly churn.
  const calDays = useMemo(() => generateCalendarDays(calYear, calMonth), [calYear, calMonth]);
  const monthName = new Date(calYear, calMonth, 1).toLocaleString("default", { month: "long" });
  const selectedDateStr = selectedDay ? `${calYear}-${pad2(calMonth + 1)}-${pad2(selectedDay)}` : null;
  const isPastDay = (day: number) => {
    const dayStr = `${calYear}-${pad2(calMonth + 1)}-${pad2(day)}`;
    return dayStr < todayUTCStr;
  };

  // Real availability, no more hardcoded blocked days/times — the only
  // source of truth for open slots.
  const { slots: availableSlots, loading: loadingSlots } = useAvailableSlots({
    vendorSlug: slug,
    date: selectedDateStr,
    durationMinutes: totalDurationMinutes,
    staffId: selectedStaffId,
  });
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDateStr]);

  const toggleService = (svc: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === svc.id)
        ? prev.filter((s) => s.id !== svc.id)
        : [...prev, svc]
    );
  };

  const setProductQty = (id: string, qty: number) => {
    setProductQtys((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: qty };
    });
  };

  const canProceed = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 2) return selectedDay !== null && selectedTime !== null;
    if (step === 4) return customerName.trim().length > 0 && customerPhone.trim().length > 0 && customerEmail.trim().length > 0;
    return true;
  };

  const handleConfirm = async () => {
    if (!selectedDateStr || !selectedTime) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorSlug: slug,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          serviceIds: selectedServices.map((s) => s.id),
          products: Object.entries(productQtys).map(([productId, quantity]) => ({ productId, quantity })),
          staffPreferenceId: selectedStaffId,
          date: selectedDateStr,
          startTime: selectedTime,
          paymentMethodId: paymentMethodId ?? undefined,
          notes: customerNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(body?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      const { booking } = (await res.json()) as { booking: { slug: string } };

      // Shape of the booking only — no name, phone, email, or notes. See
      // the warning on captureEvent in lib/analytics.ts.
      captureEvent(ANALYTICS_EVENTS.bookingSubmitted, {
        vendor_slug: slug,
        service_count: selectedServices.length,
        product_count: Object.keys(productQtys).length,
        total_pesewas: totalServiceCost + totalProductCost,
        has_staff_preference: selectedStaffId !== null,
        deep_linked: initialServices.length > 0,
      });

      router.push(`/booking/${booking.slug}`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  const summarySidebar = step < 5 && (selectedServices.length > 0 || selectedDay) && (
    <div className="hidden md:block md:sticky md:top-24 h-fit">
      <div className="rounded-[var(--rl)] p-5" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
          Your booking so far
        </p>
        {selectedServices.length > 0 ? (
          <div className="flex flex-col gap-2 mb-3">
            {selectedServices.map((svc) => (
              <div key={svc.id} className="flex items-center justify-between gap-2">
                <span className="text-sm truncate" style={{ color: "var(--tx)" }}>{svc.name}</span>
                <span className="text-sm font-medium flex-shrink-0" style={{ color: "var(--tx2)" }}>
                  {formatPrice(svc.priceInPesewas)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm mb-3" style={{ color: "var(--tx3)" }}>No services selected yet</p>
        )}
        {selectedDateStr && selectedDay && (
          <p className="text-sm mb-2" style={{ color: "var(--tx2)" }}>
            {monthName} {selectedDay} · {selectedTime ? formatSlotLabel(selectedTime) : "no time picked yet"}
          </p>
        )}
        {selectedServices.length > 0 && (
          <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--bds)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Total</span>
            <span className="font-display text-lg font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}>
              {formatPrice(totalServiceCost)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Progress Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto">
          <Link href={storefrontHref(slug, isCustomDomain)} className="flex items-center gap-2 mb-3 group">
            {vendorLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vendorLogoUrl}
                alt={`${vendorName} logo`}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                style={{ background: "var(--ac)" }}
              >
                {vendorName[0]}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate group-hover:underline" style={{ color: "var(--tx)" }}>
                {vendorName}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors"
                style={{ color: "var(--tx2)" }}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: "var(--tx3)" }}>
                Step {step + 1} of {STEPS.length}
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                {STEPS[step]}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg3)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                background: "var(--ac)",
                width: `${((step + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 py-6">
        {/* minmax(0,1fr), not 1fr. A grid column defaults to min-width:auto,
            so the time-slot grid and service cards could force the column
            wider than its share and push the whole page into horizontal
            overflow. Also moved from md to lg: at exactly 768px a 320px
            sidebar left the main column too narrow to use. */}
        <div className={step < 5 ? "lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start" : ""}>
        <div>
        {/* Step 0: Select Services */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              What would you like?
            </h2>
            {services.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: "var(--tx3)" }}>
                No services available yet — check back soon or contact us on WhatsApp.
              </p>
            ) : (
            <div className="flex flex-col gap-2">
              {services.map((svc) => {
                const selected = selectedServices.some((s) => s.id === svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left transition-all duration-150"
                    style={{
                      background: selected ? "var(--ac-bg)" : "var(--bg2)",
                      border: `1px solid ${selected ? "var(--ac)" : "var(--bds)"}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: selected ? "var(--ac)" : "var(--bg3)",
                        border: `1px solid ${selected ? "var(--ac)" : "var(--bd)"}`,
                      }}
                    >
                      {selected && <Check size={12} color="white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>
                        {svc.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock size={11} style={{ color: "var(--tx3)" }} />
                        <span className="text-xs" style={{ color: "var(--tx3)" }}>
                          {formatDuration(svc.durationMinutes)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold flex-shrink-0" style={{ color: selected ? "var(--ac)" : "var(--tx)" }}>
                      {formatPrice(svc.priceInPesewas)}
                    </p>
                  </button>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* Step 1: Staff Preference */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              Staff preference
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--tx3)" }}>
              Choose who you&apos;d like to be served by — or let us assign someone. Your preference will be considered, but final staff assignment is confirmed by the shop.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedStaffId(null)}
                className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left transition-all"
                style={{
                  background: selectedStaffId === null ? "var(--ac-bg)" : "var(--bg2)",
                  border: `1px solid ${selectedStaffId === null ? "var(--ac)" : "var(--bds)"}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg3)" }}
                >
                  <User size={16} style={{ color: "var(--tx3)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    No preference
                  </p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>
                    We&apos;ll assign the best available
                  </p>
                </div>
                {selectedStaffId === null && (
                  <Check size={16} className="ml-auto" style={{ color: "var(--ac)" }} />
                )}
              </button>
              {staff.map((s) => {
                const selected = selectedStaffId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left transition-all"
                    style={{
                      background: selected ? "var(--ac-bg)" : "var(--bg2)",
                      border: `1px solid ${selected ? "var(--ac)" : "var(--bds)"}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white"
                      style={{ background: "var(--ac)" }}
                    >
                      {s.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                        {s.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--tx3)" }}>
                        {s.role}{s.roleDetail ? ` · ${s.roleDetail}` : ""}
                      </p>
                    </div>
                    {selected && (
                      <Check size={16} className="ml-auto" style={{ color: "var(--ac)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              Pick a date & time
            </h2>

            {/* Calendar header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  setCal((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
                }}
                className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors"
                style={{ color: "var(--tx2)" }}
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                {monthName} {calYear}
              </p>
              <button
                onClick={() => {
                  setCal((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
                }}
                className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors"
                style={{ color: "var(--tx2)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div key={d} className="text-center text-xs py-1" style={{ color: "var(--tx3)" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-6">
              {calDays.map((day, i) => {
                // Keyed by the actual date, not the day number. With bare
                // day numbers the cells kept their identity across a month
                // change while the leading blanks shifted, so React reused
                // the wrong DOM nodes and the grid visibly reshuffled.
                if (day === null) return <div key={`${calYear}-${calMonth}-blank-${i}`} />;
                const blocked = isPastDay(day);
                const selected = selectedDay === day;
                return (
                  <button
                    key={`${calYear}-${calMonth}-${day}`}
                    onClick={() => !blocked && setSelectedDay(day)}
                    className="aspect-square flex items-center justify-center text-sm md:text-base rounded-[var(--r)] transition-all"
                    disabled={blocked}
                    style={{
                      background: selected ? "var(--ac)" : blocked ? "var(--bg2)" : undefined,
                      color: selected ? "white" : blocked ? "var(--tx3)" : "var(--tx2)",
                      border: !selected && !blocked ? "1px solid var(--bds)" : undefined,
                      opacity: blocked ? 0.4 : 1,
                      cursor: blocked ? "not-allowed" : "pointer",
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDay && (
              <>
                <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>
                  Available times on {monthName} {selectedDay}
                </p>
                {/* Only a full swap when there is genuinely nothing to show
                    yet. Once slots are on screen a refetch dims them in
                    place (below) instead of replacing the panel, so the
                    layout doesn't jump every time a service is toggled. */}
                {loadingSlots && availableSlots.length === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: "var(--tx3)" }}>Checking availability…</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: "var(--tx3)" }}>
                    No times available this day — try another date.
                  </p>
                ) : (
                  <div
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 transition-opacity"
                    // Stale results stay in place, dimmed and inert, while
                    // the new ones load — the panel keeps its height instead
                    // of collapsing and re-expanding on every click.
                    style={{ opacity: loadingSlots ? 0.45 : 1, pointerEvents: loadingSlots ? "none" : undefined }}
                    aria-busy={loadingSlots}
                  >
                    {availableSlots.map((slot) => {
                      const selected = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className="px-3 py-2 rounded-[var(--r)] text-sm text-center transition-all"
                          style={{
                            background: selected ? "var(--ac-bg)" : "var(--bg2)",
                            border: selected ? "1px solid var(--ac)" : "1px solid var(--bds)",
                            color: selected ? "var(--ac)" : "var(--tx2)",
                          }}
                        >
                          {formatSlotLabel(slot)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Products */}
        {step === 3 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              Add products
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--tx3)" }}>
              Take home something from our shop — optional.
            </p>
            <div className="flex flex-col gap-2">
              {products.map((p) => {
                const qty = productQtys[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-[var(--r)]"
                    style={{
                      background: qty > 0 ? "var(--ac-bg)" : "var(--bg2)",
                      border: `1px solid ${qty > 0 ? "var(--ac)" : "var(--bds)"}`,
                    }}
                  >
                    {/* Was a hardcoded empty grey box — the image data was
                        being passed in and thrown away. */}
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: "var(--bg3)" }}
                    >
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover object-top" />
                      ) : (
                        <ShoppingBag size={15} style={{ color: "var(--tx3)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>
                        {p.name}
                      </p>
                      <p className="text-xs" style={{ color: qty > 0 ? "var(--ac)" : "var(--tx3)" }}>
                        {formatPrice(p.priceInPesewas)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => setProductQty(p.id, qty - 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: "var(--bg3)", color: "var(--tx)" }}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-sm font-semibold" style={{ color: "var(--tx)" }}>
                            {qty}
                          </span>
                          <button
                            onClick={() => setProductQty(p.id, qty + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                            style={{ background: "var(--ac)" }}
                          >
                            <Plus size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setProductQty(p.id, 1)}
                          className="text-xs font-medium px-3 py-1.5 rounded-[var(--r)]"
                          style={{ background: "var(--bg3)", color: "var(--tx2)" }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Customer Details */}
        {step === 4 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              Your details
            </h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Full name"
                placeholder="e.g. Amara Johnson"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="WhatsApp number"
                type="tel"
                placeholder="e.g. 0244 123 456"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <Input
                label="Email address"
                type="email"
                placeholder="e.g. amara@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                hint="We'll email you a link to manage this booking"
              />
              <Textarea
                label="Notes (optional)"
                placeholder="Any preferences, allergies, or requests…"
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 5: Summary & Confirm */}
        {step === 5 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              Review & confirm
            </h2>

            {error && (
              <div className="px-3 py-2 mb-3 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
                {error}
              </div>
            )}

            <div className="md:grid md:grid-cols-2 md:gap-4">
              <div className="flex flex-col gap-3">
                {/* Customer */}
                <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Customer</p>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{customerName}</p>
                  <p className="text-sm" style={{ color: "var(--tx2)" }}>{customerPhone}</p>
                  <p className="text-sm" style={{ color: "var(--tx2)" }}>{customerEmail}</p>
                  {customerNotes && <p className="text-xs mt-1" style={{ color: "var(--tx3)" }}>{customerNotes}</p>}
                </div>

                {/* Services */}
                <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Services</p>
                  <div className="flex flex-col gap-1.5">
                    {selectedServices.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: "var(--tx)" }}>{svc.name}</span>
                        <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{formatPrice(svc.priceInPesewas)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date / Staff */}
                <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Appointment</p>
                  {selectedDay && (
                    <p className="text-sm" style={{ color: "var(--tx)" }}>
                      {monthName} {selectedDay}, {calYear} · {selectedTime ? formatSlotLabel(selectedTime) : ""}
                    </p>
                  )}
                  <p className="text-sm mt-1" style={{ color: "var(--tx2)" }}>
                    {selectedStaffId
                      ? staff.find((s) => s.id === selectedStaffId)?.name
                      : "No preference (auto-assign)"}
                  </p>
                </div>

                {/* Products */}
                {Object.keys(productQtys).length > 0 && (
                  <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Products</p>
                    {Object.entries(productQtys).map(([id, qty]) => {
                      const p = products.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: "var(--tx)" }}>{p.name} × {qty}</span>
                          <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{formatPrice(p.priceInPesewas * qty)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 mt-3 md:mt-0">
                {/* Payment info */}
                <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Payment</p>
                  {depositSetting === "None" ? (
                    <p className="text-sm" style={{ color: "var(--tx2)" }}>Pay on arrival — no deposit required for this booking.</p>
                  ) : (
                    <>
                      <p className="text-sm mb-3" style={{ color: "var(--tx2)" }}>
                        A deposit of <strong style={{ color: "var(--tx)" }}>{formatPrice(depositAmountPesewas)}</strong> is required to secure this booking.
                      </p>
                      {paymentMethods.length > 0 && (
                        <div className="flex flex-col gap-2 mb-2">
                          {paymentMethods.map((pm) => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setPaymentMethodId(pm.id)}
                              className="flex items-center justify-between p-3 rounded-[var(--r)] text-left"
                              style={{
                                background: paymentMethodId === pm.id ? "var(--ac-bg)" : "var(--bg3)",
                                border: `1px solid ${paymentMethodId === pm.id ? "var(--ac)" : "var(--bds)"}`,
                              }}
                            >
                              <div>
                                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{pm.label}</p>
                                <p className="text-xs" style={{ color: "var(--tx3)" }}>{pm.accountName}</p>
                              </div>
                              <div
                                className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                                style={{
                                  borderColor: paymentMethodId === pm.id ? "var(--ac)" : "var(--bd)",
                                  background: paymentMethodId === pm.id ? "var(--ac)" : "transparent",
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--bds)" }}>
                    <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Total</span>
                    <span className="font-display text-lg font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}>
                      {formatPrice(totalCost)}
                    </span>
                  </div>
                </div>

                {cancellationPolicy && (
                  <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Cancellation policy</p>
                    <p className="text-sm" style={{ color: "var(--tx2)" }}>{cancellationPolicy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
        {summarySidebar}
        </div>
      </div>

      {/* Footer CTA */}
      <div
        className="sticky bottom-0 left-0 right-0 px-4 py-4 z-20"
        style={{
          background: "var(--bg)",
          borderTop: "1px solid var(--bd)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto">
          {step === 0 && selectedServices.length > 0 && (
            <p className="text-xs text-center mb-2" style={{ color: "var(--tx3)" }}>
              {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} · Total{" "}
              <span style={{ color: "var(--ac)" }}>{formatPrice(totalServiceCost)}</span>
            </p>
          )}
          <Button
            className="w-full md:w-auto md:mx-auto md:min-w-[280px] md:flex"
            size="lg"
            loading={submitting}
            onClick={() => {
              if (step === 5) {
                handleConfirm();
              } else {
                captureEvent(ANALYTICS_EVENTS.bookingStepCompleted, {
                  vendor_slug: slug,
                  step_index: step,
                  step_name: BOOKING_STEP_NAMES[step],
                });
                setStep((s) => s + 1);
              }
            }}
            disabled={!canProceed() || submitting}
          >
            {step === 5 ? "Confirm Booking" : "Continue"}
            {step < 5 && <ChevronRight size={16} />}
          </Button>
          {step === 3 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="w-full mt-2 text-sm py-2 text-center"
              style={{ color: "var(--tx3)" }}
            >
              Skip — no products
            </button>
          )}
        </div>
      </div>

      {/* Sits after the sticky action bar, so it appears at the true bottom
          of the flow without ever competing with the Continue button. */}
      <StorefrontFooter
        vendorName={vendorName}
        verified={verified}
        ownerName={ownerName}
        ownerPhone={ownerPhone}
        ownerEmail={ownerEmail}
      />
    </div>
  );
}
