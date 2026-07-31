"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/data";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
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
  ChevronLeft,
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

// Booking times are stored with UTC-labelled fields but authored/displayed as
// plain wall-clock (see formatTime/formatDate above using timeZone: "UTC") —
// calendar date math stays in UTC throughout to match that convention.
function hourStringToInt(hour: string): number {
  const digits = hour.replace("am", "").replace("pm", "");
  return parseInt(digits, 10) + (hour.includes("pm") && digits !== "12" ? 12 : 0);
}

function startOfWeekUTC(d: Date): Date {
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function addDaysUTC(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatWeekDayLabel(d: Date): string {
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", timeZone: "UTC" });
}

interface BookingDrawerProps {
  booking: Booking;
  staff: Staff[];
  vendorSlug: string;
  vendorName: string;
  vendorLocation: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<Booking | null>;
}

function BookingDrawer({ booking, staff, vendorSlug, vendorName, vendorLocation, onClose, onUpdate }: BookingDrawerProps) {
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
  const calendarUrl = buildGoogleCalendarUrl({
    title: `${booking.customerName} — ${booking.services.map((s) => s.name).join(" + ")}`,
    startTime: booking.startTime,
    endTime: booking.endTime,
    details: `${vendorName} — Booking ${booking.slug} via Booktns`,
    location: vendorLocation,
  });

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

            {/* Products flagged */}
            {booking.products.length > 0 && (
              <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>Products flagged</p>
                <div className="flex flex-col gap-1.5">
                  {booking.products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--tx)" }}>{p.name} × {p.quantity}</span>
                      <span className="text-sm font-medium" style={{ color: "var(--tx2)" }}>{formatPrice(p.priceAtBooking * p.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium w-fit hover:underline"
                  style={{ color: "var(--ac)" }}
                >
                  <Calendar size={12} />
                  Add to my calendar
                </a>
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
  vendorName: string;
  vendorLocation: string;
}

export default function BookingsClient({ initialBookings, staff, vendorSlug, vendorName, vendorLocation }: BookingsClientProps) {
  const [bookingList, setBookingList] = useState<Booking[]>(initialBookings);
  const [tab, setTab] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedBooking = bookingList.find((b) => b.id === selectedBookingId) ?? null;

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const weekStart = useMemo(
    () => addDaysUTC(startOfWeekUTC(new Date()), weekOffset * 7),
    [weekOffset]
  );
  const weekDates = useMemo(
    () => CALENDAR_DAYS.map((_, i) => addDaysUTC(weekStart, i)),
    [weekStart]
  );

  // Built once per bookingList/week change rather than re-scanned for every
  // one of the 60 cells the calendar tab renders. Keyed by date + hour, with
  // an array per cell so multiple same-hour bookings are all shown.
  const calendarBookingsByDateHour = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookingList) {
      const bDate = b.startTime.slice(0, 10);
      const bHour = new Date(b.startTime).getUTCHours();
      const key = `${bDate}|${bHour}`;
      const existing = map.get(key);
      if (existing) existing.push(b);
      else map.set(key, [b]);
    }
    return map;
  }, [bookingList]);

  // Bookings that fall within the displayed week but outside the fixed
  // Mon–Sat / 9am–6pm grid (e.g. a Sunday booking) would otherwise be
  // silently missing from the calendar with no indication — flag them.
  const outOfGridCount = useMemo(() => {
    const fullWeekKeys = new Set(Array.from({ length: 7 }, (_, i) => toDateKey(addDaysUTC(weekStart, i))));
    const gridDayKeys = new Set(weekDates.map(toDateKey));
    const gridHours = new Set(HOURS.map(hourStringToInt));
    return bookingList.filter((b) => {
      const bDate = b.startTime.slice(0, 10);
      if (!fullWeekKeys.has(bDate)) return false;
      const bHour = new Date(b.startTime).getUTCHours();
      return !(gridDayKeys.has(bDate) && gridHours.has(bHour));
    }).length;
  }, [bookingList, weekStart, weekDates]);

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
        <div>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg2)] transition-colors"
                style={{ border: "1px solid var(--bds)", color: "var(--tx2)" }}
                aria-label="Previous week"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-1.5 rounded-[var(--r)] hover:bg-[var(--bg2)] transition-colors"
                style={{ border: "1px solid var(--bds)", color: "var(--tx2)" }}
                aria-label="Next week"
              >
                <ChevronRight size={16} />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-[var(--r)]"
                  style={{ background: "var(--ac-bg)", color: "var(--ac)" }}
                >
                  This week
                </button>
              )}
              <p className="text-sm font-medium ml-1" style={{ color: "var(--tx)" }}>
                {formatWeekDayLabel(weekDates[0])} – {formatWeekDayLabel(weekDates[5])}
              </p>
            </div>
            {outOfGridCount > 0 && (
              <p className="text-xs" style={{ color: "var(--tx3)" }}>
                {outOfGridCount} booking{outOfGridCount === 1 ? "" : "s"} this week outside Mon–Sat, 9am–6pm — see List tab
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="rounded-[var(--rl)] overflow-hidden min-w-[600px]" style={{ border: "1px solid var(--bds)" }}>
              <div
                className="grid text-xs font-semibold uppercase tracking-wide"
                style={{ gridTemplateColumns: "60px repeat(6, 1fr)", background: "var(--bg2)", borderBottom: "1px solid var(--bds)" }}
              >
                <div className="px-2 py-3 text-center" style={{ color: "var(--tx3)" }} />
                {weekDates.map((d, i) => {
                  const isToday = toDateKey(d) === todayKey;
                  return (
                    <div key={toDateKey(d)} className="px-2 py-3 text-center" style={{ color: isToday ? "var(--ac)" : "var(--tx3)" }}>
                      <span>{CALENDAR_DAYS[i]}</span>
                      <span className="block font-bold text-sm" style={{ color: isToday ? "var(--ac)" : "var(--tx)" }}>
                        {d.getUTCDate()}
                      </span>
                    </div>
                  );
                })}
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
                  {weekDates.map((d, di) => {
                    const dayKey = toDateKey(d);
                    const hourInt = hourStringToInt(hour);
                    const cellBookings = calendarBookingsByDateHour.get(`${dayKey}|${hourInt}`) ?? [];
                    const isToday = dayKey === todayKey;

                    return (
                      <div
                        key={dayKey}
                        className="p-1 min-h-[52px] flex flex-col gap-1"
                        style={{
                          borderRight: di < 5 ? "1px solid var(--bds)" : undefined,
                          background: isToday ? "var(--ac-bg)" : undefined,
                        }}
                      >
                        {cellBookings.map((booking) => (
                          <button
                            key={booking.id}
                            onClick={() => setSelectedBookingId(booking.id)}
                            className="w-full text-left px-2 py-1.5 rounded text-xs font-medium truncate"
                            style={{
                              background: booking.status === "confirmed" ? "var(--ac-bg)" : "var(--bds)",
                              color: booking.status === "confirmed" ? "var(--ac)" : "var(--tx2)",
                            }}
                            title={`${booking.customerName} · ${booking.assignedStaffName ?? "Unassigned"}`}
                          >
                            <span className="block truncate">{booking.customerName.split(" ")[0]}</span>
                            {booking.assignedStaffName && (
                              <span className="block font-normal opacity-75 truncate">{booking.assignedStaffName}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <BookingDrawer
          booking={selectedBooking}
          staff={staff}
          vendorSlug={vendorSlug}
          vendorName={vendorName}
          vendorLocation={vendorLocation}
          onClose={() => setSelectedBookingId(null)}
          onUpdate={updateBooking}
        />
      )}
    </div>
  );
}
