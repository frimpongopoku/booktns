"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";
import { services, products, staff, vendor, paymentMethods, formatPrice, formatDuration } from "@/lib/data";
import type { Service, Product } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";

const STEPS = [
  "Services",
  "Staff",
  "Date & Time",
  "Products",
  "Your Details",
  "Confirm",
];

const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
];

const BLOCKED_SLOTS = ["10:00 AM", "10:30 AM", "2:00 PM", "2:30 PM"];

function generateCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

const BLOCKED_DAYS = [3, 7, 14, 21, 22, 28];

export default function BookingFlow({ slug }: { slug: string }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  // Step 1 — Services
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  // Step 2 — Staff
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Step 3 — Date & Time
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Step 4 — Products
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});

  // Step 5 — Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const totalServiceCost = selectedServices.reduce((s, svc) => s + svc.priceInPesewas, 0);
  const totalProductCost = Object.entries(productQtys).reduce((s, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return s + (p ? p.priceInPesewas * qty : 0);
  }, 0);
  const totalCost = totalServiceCost + totalProductCost;

  const calDays = generateCalendarDays(calYear, calMonth);
  const monthName = new Date(calYear, calMonth, 1).toLocaleString("default", { month: "long" });

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

  const handleConfirm = () => {
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: "var(--bg)" }}>
        <div className="max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "var(--green-bg)" }}
          >
            <CheckCircle2 size={32} style={{ color: "var(--green)" }} />
          </div>
          <h2
            className="font-display text-2xl font-medium mb-3"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            Booking Submitted!
          </h2>
          <p className="text-sm mb-2" style={{ color: "var(--tx2)" }}>
            Your booking request has been sent to <strong>{vendor.name}</strong>.
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--tx2)" }}>
            You&apos;ll receive a WhatsApp message at {customerPhone} once it&apos;s confirmed.
          </p>

          <div className="rounded-[var(--rl)] p-5 mb-6 text-left" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>
              Booking Reference
            </p>
            <p className="font-display text-xl font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}>
              BKT-00235
            </p>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--bds)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{customerName}</p>
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                {selectedServices.map((s) => s.name).join(" + ")}
              </p>
              {selectedDay && (
                <p className="text-sm" style={{ color: "var(--tx2)" }}>
                  {monthName} {selectedDay} · {selectedTime}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/booking/bkt-00235`}
              className="flex-1 px-4 py-2.5 rounded-[var(--r)] text-sm font-medium text-white text-center"
              style={{ background: "var(--ac)" }}
            >
              View Booking
            </Link>
            <Link
              href={`/${slug}`}
              className="flex-1 px-4 py-2.5 rounded-[var(--r)] text-sm font-medium text-center"
              style={{ background: "var(--bg3)", color: "var(--tx)" }}
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Progress Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <div className="max-w-xl mx-auto">
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
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Step 0: Select Services */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              What would you like?
            </h2>
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
                      <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
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
          </div>
        )}

        {/* Step 1: Staff Preference */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-medium mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              Staff preference
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--tx3)" }}>
              Choose who you&apos;d like to be served by — or let us assign someone.
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
            <div className="grid grid-cols-7 gap-1 mb-6">
              {calDays.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />;
                const blocked = BLOCKED_DAYS.includes(day);
                const selected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => !blocked && setSelectedDay(day)}
                    className="aspect-square flex items-center justify-center text-sm rounded-[var(--r)] transition-all"
                    disabled={blocked}
                    style={{
                      background: selected ? "var(--ac)" : blocked ? "var(--bg2)" : undefined,
                      color: selected ? "white" : blocked ? "var(--tx3)" : "var(--tx2)",
                      border: !selected && !blocked ? "1px solid var(--bds)" : undefined,
                      textDecoration: blocked ? "line-through" : undefined,
                      opacity: blocked ? 0.5 : 1,
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const blocked = BLOCKED_SLOTS.includes(slot);
                    const selected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => !blocked && setSelectedTime(slot)}
                        disabled={blocked}
                        className="px-3 py-2 rounded-[var(--r)] text-sm text-center transition-all"
                        style={{
                          background: selected
                            ? "var(--ac-bg)"
                            : blocked
                            ? "var(--bg2)"
                            : "var(--bg2)",
                          border: selected
                            ? "1px solid var(--ac)"
                            : "1px solid var(--bds)",
                          color: selected
                            ? "var(--ac)"
                            : blocked
                            ? "var(--tx3)"
                            : "var(--tx2)",
                          textDecoration: blocked ? "line-through" : undefined,
                          opacity: blocked ? 0.5 : 1,
                          cursor: blocked ? "not-allowed" : "pointer",
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
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
                      <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
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
                placeholder="+234 800 000 0000"
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
                {selectedDay && <p className="text-sm" style={{ color: "var(--tx)" }}>{monthName} {selectedDay}, {calYear} · {selectedTime}</p>}
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

              {/* Payment info */}
              <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Payment</p>
                <p className="text-sm" style={{ color: "var(--tx2)" }}>Pay on arrival — no deposit required for this booking.</p>
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--bds)" }}>
                  <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Total</span>
                  <span className="font-display text-lg font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}>
                    {formatPrice(totalCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
        <div className="max-w-xl mx-auto">
          {step === 0 && selectedServices.length > 0 && (
            <p className="text-xs text-center mb-2" style={{ color: "var(--tx3)" }}>
              {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} · Total{" "}
              <span style={{ color: "var(--ac)" }}>{formatPrice(totalServiceCost)}</span>
            </p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              if (step === 5) {
                handleConfirm();
              } else {
                setStep((s) => s + 1);
              }
            }}
            disabled={!canProceed()}
          >
            {step === 5
              ? "Confirm Booking"
              : step === 3
              ? "Continue"
              : step === 1
              ? "Continue"
              : "Continue"}
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
