"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/data";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import type { Booking, BookingStatus, Staff } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import { bookingStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  X,
  Calendar,
  User,
  Clock,
  MessageCircle,
  AlignLeft,
  ChevronRight,
  Search,
  CheckCircle,
  XCircle,
  RotateCcw,
  UserPlus,
  CheckCheck,
} from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

const CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm"];

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed", "rescheduled"];

interface BookingDrawerProps {
  booking: Booking;
  staff: Staff[];
  vendorSlug: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<Booking | null>;
}

function BookingDrawer({ booking, staff, vendorSlug, onClose, onUpdate }: BookingDrawerProps) {
  const [note, setNote] = useState(booking.notes);
  // Only one of these panels is meaningful open at a time — a single field
  // (rather than 3 independent booleans) makes that the only representable
  // state, instead of leaving "assign staff and reschedule both open" possible.
  const [activePanel, setActivePanel] = useState<"note" | "assignStaff" | "reschedule" | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 260); };

  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const durationMinutes = Math.round(
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60_000
  );
  const staffId = booking.assignedStaffId ?? booking.staffPreferenceId;

  const { slots: rescheduleSlots, loading: loadingSlots } = useAvailableSlots({
    vendorSlug,
    date: rescheduleDate || null,
    durationMinutes,
    staffId,
    excludeBookingId: booking.id,
  });
  useEffect(() => {
    setRescheduleTime(null);
  }, [rescheduleDate]);

  const runAction = async (patch: Record<string, unknown>) => {
    setBusy(true);
    await onUpdate(booking.id, patch);
    setBusy(false);
  };

  const confirmReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) return;
    const [year, month, day] = rescheduleDate.split("-").map(Number);
    const [hour, minute] = rescheduleTime.split(":").map(Number);
    const startTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
    setBusy(true);
    const updated = await onUpdate(booking.id, {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: "rescheduled",
    });
    setBusy(false);
    if (updated) setActivePanel(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className={`flex-1 cursor-pointer ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
        style={{ background: "rgba(0,0,0,0.35)" }}
        onClick={close}
      />
      <div
        className={`w-full max-w-sm flex flex-col overflow-hidden ${isExiting ? "anim-slide-out-right" : "anim-slide-right"}`}
        style={{ background: "var(--bg)", borderLeft: "1px solid var(--bd)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--bd)" }}>
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--tx3)" }}>Booking</p>
            <p className="font-display text-base font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
              {booking.slug}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bookingStatusBadge(booking.status)}
            <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">
            {/* Customer */}
            <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Customer</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0" style={{ background: "var(--ac)" }}>
                  {booking.customerName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{booking.customerName}</p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>{booking.customerPhone}</p>
                </div>
                <a
                  href={`https://wa.me/${booking.customerPhone.replace("+", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto p-1.5 rounded-full hover:bg-[var(--bg3)]"
                  style={{ color: "var(--green)" }}
                  aria-label="Message on WhatsApp"
                >
                  <MessageCircle size={16} />
                </a>
              </div>
            </div>

            {/* Services */}
            <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Services</p>
              <div className="flex flex-col gap-1.5">
                {booking.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--tx)" }}>{s.name}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{formatPrice(s.priceAtBooking)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: "1px solid var(--bds)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--tx3)" }}>Total</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                    {formatPrice(booking.services.reduce((sum, s) => sum + s.priceAtBooking, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment */}
            <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Appointment</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: "var(--tx3)" }} />
                  <span className="text-sm" style={{ color: "var(--tx)" }}>{formatDate(booking.startTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: "var(--tx3)" }} />
                  <span className="text-sm" style={{ color: "var(--tx)" }}>
                    {formatTime(booking.startTime)} — {formatTime(booking.endTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} style={{ color: "var(--tx3)" }} />
                  <span className="text-sm" style={{ color: "var(--tx)" }}>
                    {booking.assignedStaffName ?? (booking.staffPreferenceName ? `${booking.staffPreferenceName} (preferred)` : "Unassigned")}
                  </span>
                </div>
              </div>
            </div>

            {/* Assign staff picker */}
            {activePanel === "assignStaff" && (
              <div className="flex flex-col gap-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    disabled={busy}
                    onClick={async () => { await runAction({ assignedStaffId: s.id }); setActivePanel(null); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-[var(--r)] text-left disabled:opacity-50"
                    style={{
                      background: booking.assignedStaffId === s.id ? "var(--ac-bg)" : "var(--bg2)",
                      border: `1px solid ${booking.assignedStaffId === s.id ? "var(--ac)" : "var(--bds)"}`,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{s.name}</span>
                  </button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setActivePanel(null)}>Cancel</Button>
              </div>
            )}

            {/* Reschedule picker */}
            {activePanel === "reschedule" && (
              <div className="flex flex-col gap-2 p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
                  style={{ background: "var(--bg)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                />
                {loadingSlots ? (
                  <p className="text-xs text-center py-2" style={{ color: "var(--tx3)" }}>Checking availability…</p>
                ) : rescheduleDate && rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-center py-2" style={{ color: "var(--tx3)" }}>No times available this day</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {rescheduleSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setRescheduleTime(slot)}
                        className="px-2 py-1.5 rounded text-xs text-center"
                        style={{
                          background: rescheduleTime === slot ? "var(--ac)" : "var(--bg)",
                          color: rescheduleTime === slot ? "white" : "var(--tx2)",
                          border: "1px solid var(--bds)",
                        }}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <Button variant="secondary" size="sm" onClick={() => setActivePanel(null)}>Cancel</Button>
                  <Button size="sm" loading={busy} disabled={!rescheduleTime} onClick={confirmReschedule}>Confirm new time</Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {booking.notes && activePanel !== "note" && (
              <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Notes</p>
                <p className="text-sm" style={{ color: "var(--tx2)" }}>{booking.notes}</p>
              </div>
            )}

            {activePanel === "note" && (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-[var(--r)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
                  rows={3}
                  placeholder="Add a note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setActivePanel(null)}>Cancel</Button>
                  <Button size="sm" loading={busy} onClick={async () => { await runAction({ notes: note }); setActivePanel(null); }}>
                    Save Note
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 p-4 grid grid-cols-2 gap-2" style={{ borderTop: "1px solid var(--bd)" }}>
          {booking.status === "pending" && (
            <Button variant="primary" size="sm" className="col-span-2" loading={busy} onClick={() => runAction({ status: "confirmed" })}>
              <CheckCircle size={14} />
              Confirm Booking
            </Button>
          )}
          {isActive && booking.status !== "pending" && (
            <Button variant="primary" size="sm" className="col-span-2" loading={busy} onClick={() => runAction({ status: "completed" })}>
              <CheckCheck size={14} />
              Mark Complete
            </Button>
          )}
          {isActive && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setActivePanel((p) => (p === "assignStaff" ? null : "assignStaff"))}>
                <UserPlus size={14} />
                Assign Staff
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setActivePanel((p) => (p === "reschedule" ? null : "reschedule"))}>
                <RotateCcw size={14} />
                Reschedule
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="col-span-2" onClick={() => setActivePanel("note")}>
            <AlignLeft size={14} />
            Add Note
          </Button>
          {isActive && (
            <Button variant="danger" size="sm" className="col-span-2" onClick={() => setConfirmingCancel(true)}>
              <XCircle size={14} />
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {confirmingCancel && (
        <ConfirmDialog
          title="Cancel booking"
          message={`Cancel ${booking.customerName}'s booking? This can't be undone.`}
          confirmLabel="Cancel booking"
          danger
          onConfirm={async () => { await runAction({ status: "cancelled" }); setConfirmingCancel(false); }}
          onCancel={() => setConfirmingCancel(false)}
        />
      )}
    </div>
  );
}

interface BookingsClientProps {
  initialBookings: Booking[];
  staff: Staff[];
  vendorSlug: string;
}

export default function BookingsClient({ initialBookings, staff, vendorSlug }: BookingsClientProps) {
  const [bookingList, setBookingList] = useState<Booking[]>(initialBookings);
  const [tab, setTab] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedBooking = bookingList.find((b) => b.id === selectedBookingId) ?? null;

  // Built once per bookingList change rather than re-scanned for every one of
  // the 60 cells the (decorative, hardcoded-July-2025) calendar tab renders.
  const calendarBookingByDateHour = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const b of bookingList) {
      const bDate = b.startTime.slice(0, 10);
      const bHour = new Date(b.startTime).getUTCHours();
      map.set(`${bDate}|${bHour}`, b);
    }
    return map;
  }, [bookingList]);

  const updateBooking = async (id: string, patch: Record<string, unknown>): Promise<Booking | null> => {
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        setError(body?.error ?? "Something went wrong. Please try again.");
        return null;
      }
      const { booking } = (await res.json()) as { booking: Booking };
      setBookingList((prev) => prev.map((b) => (b.id === id ? booking : b)));
      return booking;
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      return null;
    }
  };

  const filtered = bookingList.filter((b) => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.services.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <Topbar title="Bookings" subtitle={`${bookingList.length} total bookings`} />

      {error && (
        <div className="px-3 py-2 mb-4 rounded-[var(--r)] text-sm" style={{ background: "rgba(185,28,28,0.08)", color: "#B91C1C" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[var(--r)] mb-5 w-fit" style={{ background: "var(--bg2)" }}>
        {(["list", "calendar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-[var(--r)] text-sm font-medium transition-all capitalize"
            style={
              tab === t
                ? { background: "var(--bg)", color: "var(--tx)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "var(--tx3)" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[var(--r)] flex-1 min-w-[200px]"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <Search size={14} style={{ color: "var(--tx3)" }} />
              <input
                type="text"
                placeholder="Search customer or service…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--tx)" }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
              className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bds)" }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-[var(--rl)] overflow-hidden" style={{ border: "1px solid var(--bds)" }}>
            <div
              className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{ background: "var(--bg2)", color: "var(--tx3)" }}
            >
              <span>Time</span>
              <span>Customer & Service</span>
              <span>Staff</span>
              <span>Status</span>
              <span />
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center" style={{ background: "var(--bg2)" }}>
                <p className="text-sm" style={{ color: "var(--tx3)" }}>No bookings match your search</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 p-2" style={{ background: "var(--bg)" }}>
                {filtered.map((booking) => (
                  <button
                    key={booking.id}
                    className="w-full grid md:grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 md:gap-4 px-3 py-3 text-left rounded-lg hover:bg-[var(--bg2)] transition-colors items-center"
                    onClick={() => setSelectedBookingId(booking.id)}
                  >
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--tx3)" }}>{formatDate(booking.startTime)}</p>
                      <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{formatTime(booking.startTime)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>{booking.customerName}</p>
                      <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                        {booking.services.map((s) => s.name).join(" + ")}
                      </p>
                    </div>
                    <p className="text-sm hidden md:block" style={{ color: "var(--tx2)" }}>
                      {booking.assignedStaffName ?? "Unassigned"}
                    </p>
                    <div className="hidden md:flex">{bookingStatusBadge(booking.status)}</div>
                    <ChevronRight size={16} style={{ color: "var(--tx3)" }} className="hidden md:block" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "calendar" && (
        <div className="overflow-x-auto">
          <div className="rounded-[var(--rl)] overflow-hidden min-w-[600px]" style={{ border: "1px solid var(--bds)" }}>
            {/* Calendar header — visual placeholder only, not rebuilt this pass */}
            <div
              className="grid text-xs font-semibold uppercase tracking-wide"
              style={{ gridTemplateColumns: "60px repeat(6, 1fr)", background: "var(--bg2)", borderBottom: "1px solid var(--bds)" }}
            >
              <div className="px-2 py-3 text-center" style={{ color: "var(--tx3)" }} />
              {CALENDAR_DAYS.map((d, i) => (
                <div key={d} className="px-2 py-3 text-center" style={{ color: i === 0 ? "var(--ac)" : "var(--tx3)" }}>
                  <span>{d}</span>
                  <span className="block font-bold text-sm" style={{ color: i === 0 ? "var(--ac)" : "var(--tx)" }}>
                    {16 + i}
                  </span>
                </div>
              ))}
            </div>

            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid"
                style={{ gridTemplateColumns: "60px repeat(6, 1fr)", borderBottom: "1px solid var(--bds)", background: "var(--bg)" }}
              >
                <div className="px-2 py-3 text-xs text-right pr-3" style={{ color: "var(--tx3)", borderRight: "1px solid var(--bds)" }}>
                  {hour}
                </div>
                {CALENDAR_DAYS.map((_, di) => {
                  const dayDate = `2025-07-${String(16 + di).padStart(2, "0")}`;
                  const hourNum = hour.replace("am", "").replace("pm", "");
                  const hourInt = parseInt(hourNum) + (hour.includes("pm") && hourNum !== "12" ? 12 : 0);
                  const booking = calendarBookingByDateHour.get(`${dayDate}|${hourInt}`);

                  return (
                    <div key={di} className="p-1 min-h-[52px]" style={{ borderRight: di < 5 ? "1px solid var(--bds)" : undefined }}>
                      {booking && (
                        <button
                          onClick={() => setSelectedBookingId(booking.id)}
                          className="w-full text-left px-2 py-1.5 rounded text-xs font-medium truncate"
                          style={{
                            background: booking.status === "confirmed" ? "var(--ac-bg)" : "var(--bds)",
                            color: booking.status === "confirmed" ? "var(--ac)" : "var(--tx2)",
                          }}
                        >
                          {booking.customerName.split(" ")[0]}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedBooking && (
        <BookingDrawer
          booking={selectedBooking}
          staff={staff}
          vendorSlug={vendorSlug}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={updateBooking}
        />
      )}
    </div>
  );
}
