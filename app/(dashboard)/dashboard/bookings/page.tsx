"use client";

import { useState } from "react";
import { bookings, staff, formatPrice } from "@/lib/data";
import type { Booking, BookingStatus } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  X,
  Calendar,
  User,
  Clock,
  Download,
  MessageCircle,
  AlignLeft,
  ChevronRight,
  Search,
  CheckCircle,
  XCircle,
  RotateCcw,
  UserPlus,
} from "lucide-react";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric" });
}

const CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm"];

interface BookingDrawerProps {
  booking: Booking;
  onClose: () => void;
}

function BookingDrawer({ booking, onClose }: BookingDrawerProps) {
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 cursor-pointer"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="w-full max-w-sm flex flex-col overflow-hidden"
        style={{
          background: "var(--bg)",
          borderLeft: "1px solid var(--bd)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--bd)" }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--tx3)" }}>
              Booking
            </p>
            <p
              className="font-display text-base font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              {booking.slug.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bookingStatusBadge(booking.status)}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors"
              style={{ color: "var(--tx3)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-4">
            {/* Customer */}
            <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
                Customer
              </p>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ background: "var(--ac)" }}
                >
                  {booking.customerName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    {booking.customerName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--tx3)" }}>
                    {booking.customerPhone}
                  </p>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
                Services
              </p>
              <div className="flex flex-col gap-1.5">
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
                  <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                    {formatPrice(booking.services.reduce((sum, s) => sum + s.priceAtBooking, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Appointment */}
            <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
                Appointment
              </p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: "var(--tx3)" }} />
                  <span className="text-sm" style={{ color: "var(--tx)" }}>
                    {formatDate(booking.startTime)}
                  </span>
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
                    {booking.staffName ?? "Unassigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--tx3)" }}>
                  Notes
                </p>
                <p className="text-sm" style={{ color: "var(--tx2)" }}>{booking.notes}</p>
              </div>
            )}

            {/* Add note */}
            {showNoteInput && (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-[var(--r)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
                  rows={3}
                  placeholder="Add a note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    background: "var(--bg2)",
                    color: "var(--tx)",
                    border: "1px solid var(--bd)",
                  }}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowNoteInput(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => { setShowNoteInput(false); setNote(""); }}>
                    Save Note
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex-shrink-0 p-4 grid grid-cols-2 gap-2"
          style={{ borderTop: "1px solid var(--bd)" }}
        >
          {booking.status === "pending" && (
            <Button variant="primary" size="sm" className="col-span-2">
              <CheckCircle size={14} />
              Confirm Booking
            </Button>
          )}
          <Button variant="secondary" size="sm">
            <UserPlus size={14} />
            Assign Staff
          </Button>
          <Button variant="secondary" size="sm">
            <RotateCcw size={14} />
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNoteInput(true)}
          >
            <AlignLeft size={14} />
            Add Note
          </Button>
          <Button variant="ghost" size="sm">
            <Download size={14} />
            PDF
          </Button>
          <Button variant="danger" size="sm" className="col-span-2">
            <XCircle size={14} />
            Cancel Booking
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const [tab, setTab] = useState<"list" | "calendar">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.services.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <Topbar
        title="Bookings"
        subtitle={`${bookings.length} total bookings`}
      />

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-[var(--r)] mb-5 w-fit"
        style={{ background: "var(--bg2)" }}
      >
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
              style={{
                background: "var(--bg2)",
                color: "var(--tx)",
                border: "1px solid var(--bds)",
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div
            className="rounded-[var(--rl)] overflow-hidden"
            style={{ border: "1px solid var(--bds)" }}
          >
            {/* Header */}
            <div
              className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
              style={{
                background: "var(--bg2)",
                color: "var(--tx3)",
                borderBottom: "1px solid var(--bds)",
              }}
            >
              <span>Time</span>
              <span>Customer & Service</span>
              <span>Staff</span>
              <span>Status</span>
              <span />
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center" style={{ background: "var(--bg2)" }}>
                <p className="text-sm" style={{ color: "var(--tx3)" }}>
                  No bookings match your search
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--bds)", background: "var(--bg)" }}>
                {filtered.map((booking) => (
                  <button
                    key={booking.id}
                    className="w-full grid md:grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 md:gap-4 px-4 py-3.5 text-left hover:bg-[var(--bg2)] transition-colors items-center"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--tx3)" }}>
                        {formatDate(booking.startTime)}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                        {formatTime(booking.startTime)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--tx)" }}>
                        {booking.customerName}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--tx3)" }}>
                        {booking.services.map((s) => s.name).join(" + ")}
                      </p>
                    </div>
                    <p className="text-sm hidden md:block" style={{ color: "var(--tx2)" }}>
                      {booking.staffName ?? "Unassigned"}
                    </p>
                    <div className="hidden md:flex">
                      {bookingStatusBadge(booking.status)}
                    </div>
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
          <div
            className="rounded-[var(--rl)] overflow-hidden min-w-[600px]"
            style={{ border: "1px solid var(--bds)" }}
          >
            {/* Calendar header */}
            <div
              className="grid text-xs font-semibold uppercase tracking-wide"
              style={{
                gridTemplateColumns: "60px repeat(6, 1fr)",
                background: "var(--bg2)",
                borderBottom: "1px solid var(--bds)",
              }}
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

            {/* Time rows */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid"
                style={{
                  gridTemplateColumns: "60px repeat(6, 1fr)",
                  borderBottom: "1px solid var(--bds)",
                  background: "var(--bg)",
                }}
              >
                <div
                  className="px-2 py-3 text-xs text-right pr-3"
                  style={{ color: "var(--tx3)", borderRight: "1px solid var(--bds)" }}
                >
                  {hour}
                </div>
                {CALENDAR_DAYS.map((_, di) => {
                  const dayDate = `2025-07-${String(16 + di).padStart(2, "0")}`;
                  const hourNum = hour.replace("am", "").replace("pm", "");
                  const hourInt = parseInt(hourNum) + (hour.includes("pm") && hourNum !== "12" ? 12 : 0);
                  const booking = bookings.find((b) => {
                    const bDate = b.startTime.slice(0, 10);
                    const bHour = new Date(b.startTime).getHours();
                    return bDate === dayDate && bHour === hourInt;
                  });

                  return (
                    <div
                      key={di}
                      className="p-1 min-h-[52px]"
                      style={{ borderRight: di < 5 ? "1px solid var(--bds)" : undefined }}
                    >
                      {booking && (
                        <button
                          onClick={() => setSelectedBooking(booking)}
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

      {/* Drawer */}
      {selectedBooking && (
        <BookingDrawer booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}
