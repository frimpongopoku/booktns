"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Minus,
  Plus,
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/data";
import { calculateDepositAmountPesewas } from "@/lib/deposit";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import type { Service, Product, Staff, PaymentMethod, DepositSetting } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";

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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

interface BookingFlowProps {
  slug: string;
  services: Service[];
  products: Product[];
  staff: Staff[];
  depositSetting: DepositSetting;
  depositValue?: number;
  cancellationPolicy?: string;
  paymentMethods: PaymentMethod[];
}

export default function BookingFlow({
  slug,
  services,
  products,
  staff,
  depositSetting,
  depositValue,
  cancellationPolicy,
  paymentMethods,
}: BookingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 — Services
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  // Step 2 — Staff
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Step 3 — Date & Time. Ghana is UTC+0 (matching the server-side assumption
  // in lib/availability.ts), so "today" is derived from UTC here rather than
  // the browser's local timezone — a customer browsing from outside UTC+0
  // would otherwise see a "today" out of sync with what the server actually
  // validates availability against.
  const now = new Date();
  const todayUTCStr = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  const [calMonth, setCalMonth] = useState(now.getUTCMonth());
  const [calYear, setCalYear] = useState(now.getUTCFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 4 — Products
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});

  // Step 5 — Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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

  const calDays = generateCalendarDays(calYear, calMonth);
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
    if (step === 4) return customerName.trim().length > 0 && customerPhone.trim().length > 0;
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Progress Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto">
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
      <div className="max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-4 py-6">
        <div className={step < 5 ? "md:grid md:grid-cols-[1fr_320px] md:gap-8 md:items-start" : ""}>
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
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
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
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                  else setCalMonth(m => m + 1);
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
                if (day === null) return <div key={`empty-${i}`} />;
                const blocked = isPastDay(day);
                const selected = selectedDay === day;
                return (
                  <button
                    key={day}
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
                {loadingSlots ? (
                  <p className="text-sm py-6 text-center" style={{ color: "var(--tx3)" }}>Checking availability…</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm py-6 text-center" style={{ color: "var(--tx3)" }}>
                    No times available this day — try another date.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
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
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                      style={{ background: "var(--bg3)" }}
                    />
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
                hint="We'll send your booking confirmation here"
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
        <div className="max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto">
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
    </div>
  );
}
