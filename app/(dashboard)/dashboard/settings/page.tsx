"use client";

import { useState } from "react";
import { vendor, paymentMethods } from "@/lib/data";
import Topbar from "@/components/dashboard/Topbar";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { CreditCard, Smartphone, Banknote, Check } from "lucide-react";

type SettingsTab = "storefront" | "payment" | "booking" | "whatsapp" | "billing";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "storefront", label: "Storefront" },
  { key: "payment", label: "Payment" },
  { key: "booking", label: "Booking" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "billing", label: "Billing" },
];

const BILLING_HISTORY = [
  { date: "Jun 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
  { date: "May 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
  { date: "Apr 1, 2025", amount: "GH₵ 99", plan: "Starter", status: "Paid" },
];

function PaymentMethodIcon({ type }: { type: string }) {
  if (type === "momo") return <Smartphone size={16} style={{ color: "#F59E0B" }} />;
  if (type === "bank") return <CreditCard size={16} style={{ color: "#2563EB" }} />;
  return <Banknote size={16} style={{ color: "var(--green)" }} />;
}

function StorefrontTab() {
  const [name, setName] = useState(vendor.name);
  const [slug, setSlug] = useState(vendor.slug);
  const [description, setDescription] = useState(vendor.description);
  const [location, setLocation] = useState(vendor.location);
  const [hours, setHours] = useState(vendor.hours);
  const [phone, setPhone] = useState(vendor.phone);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <Input label="Business name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label="Storefront URL slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        hint={`booktns.com/${slug}`}
      />
      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Input label="Business hours" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon–Sat 9am–7pm" />
      <Input label="Contact phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button onClick={handleSave} className="w-fit">
        {saved ? <><Check size={14} /> Saved</> : "Save Changes"}
      </Button>
    </div>
  );
}

function PaymentTab() {
  return (
    <div className="max-w-xl">
      <div className="flex flex-col gap-3 mb-6">
        {paymentMethods.map((pm) => (
          <div
            key={pm.id}
            className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
          >
            <div
              className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--bg3)" }}
            >
              <PaymentMethodIcon type={pm.type} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{pm.label}</p>
              <p className="text-xs" style={{ color: "var(--tx3)" }}>
                {pm.accountName}
                {pm.accountNumber && ` · ${pm.accountNumber}`}
                {pm.bankName && ` · ${pm.bankName}`}
              </p>
            </div>
            <Button variant="ghost" size="sm">Edit</Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm">
        + Add payment method
      </Button>
    </div>
  );
}

function BookingTab() {
  const [depositType, setDepositType] = useState<"none" | "fixed" | "percent">("none");
  const [depositAmount, setDepositAmount] = useState("50");
  const [policy, setPolicy] = useState(
    "Cancellations made 24+ hours before the appointment are eligible for a full refund. Same-day cancellations are non-refundable."
  );

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>Deposit requirement</p>
        <div className="flex flex-col gap-2">
          {(["none", "fixed", "percent"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setDepositType(type)}
              className="flex items-center gap-3 p-3 rounded-[var(--r)] text-left"
              style={{
                background: depositType === type ? "var(--ac-bg)" : "var(--bg2)",
                border: `1px solid ${depositType === type ? "var(--ac)" : "var(--bds)"}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: depositType === type ? "var(--ac)" : "var(--bd)",
                  background: depositType === type ? "var(--ac)" : "transparent",
                }}
              >
                {depositType === type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                  {type === "none" ? "No deposit" : type === "fixed" ? "Fixed amount" : "Percentage"}
                </p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>
                  {type === "none"
                    ? "Customers pay in full on arrival"
                    : type === "fixed"
                    ? "Require a fixed deposit per booking"
                    : "Require a % of the booking total"}
                </p>
              </div>
            </button>
          ))}
        </div>
        {depositType !== "none" && (
          <div className="mt-3">
            <Input
              label={depositType === "fixed" ? "Deposit amount (GH₵)" : "Deposit percentage (%)"}
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
        )}
      </div>
      <Textarea
        label="Cancellation policy"
        value={policy}
        onChange={(e) => setPolicy(e.target.value)}
        rows={4}
      />
      <Button className="w-fit">Save Booking Settings</Button>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="max-w-xl">
      <p className="text-sm mb-4" style={{ color: "var(--tx2)" }}>
        Connected WhatsApp numbers receive booking notifications and can manage bookings via the bot.
      </p>
      <div className="flex flex-col gap-3 mb-6">
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--ac)" }}
          >
            R
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Rose Adeyemi</p>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>+2348012345678 · Owner</p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
            title="Connected"
          />
        </div>
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--rl)]"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
            style={{ background: "var(--green)" }}
          >
            F
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Fatima Bello</p>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>+2348023456789 · Management</p>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--green)" }}
            title="Connected"
          />
        </div>
      </div>
      <Button variant="secondary" size="sm">+ Add WhatsApp number</Button>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-xl">
      {/* Current plan */}
      <div
        className="p-5 rounded-[var(--rl)] mb-6"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--tx3)" }}>
              Current Plan
            </p>
            <p
              className="font-display text-2xl font-medium"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              Starter
            </p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}
          >
            Active
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--tx2)" }}>
          <span>GH₵ 99 / month</span>
          <span>·</span>
          <span>Next billing: <span style={{ color: "var(--tx)" }}>Aug 1, 2025</span></span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm">Upgrade Plan</Button>
          <Button variant="ghost" size="sm">Manage Billing</Button>
        </div>
      </div>

      {/* Billing history */}
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--tx)" }}>Billing History</p>
      <div
        className="rounded-[var(--rl)] overflow-hidden"
        style={{ border: "1px solid var(--bds)" }}
      >
        <div
          className="grid grid-cols-4 gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{ background: "var(--bg2)", color: "var(--tx3)", borderBottom: "1px solid var(--bds)" }}
        >
          <span>Date</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Status</span>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--bds)", background: "var(--bg)" }}>
          {BILLING_HISTORY.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 items-center">
              <span className="text-sm" style={{ color: "var(--tx2)" }}>{row.date}</span>
              <span className="text-sm" style={{ color: "var(--tx)" }}>{row.plan}</span>
              <span className="text-sm font-medium" style={{ color: "var(--tx)" }}>{row.amount}</span>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full w-fit"
                style={{ background: "var(--green-bg)", color: "var(--green)" }}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("storefront");

  return (
    <div>
      <Topbar title="Settings" />

      {/* Tab nav */}
      <div
        className="flex overflow-x-auto gap-1 p-1 rounded-[var(--r)] mb-6 w-fit max-w-full"
        style={{ background: "var(--bg2)" }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-[var(--r)] text-sm font-medium transition-all whitespace-nowrap"
            style={
              tab === t.key
                ? { background: "var(--bg)", color: "var(--tx)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "var(--tx3)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "storefront" && <StorefrontTab />}
      {tab === "payment" && <PaymentTab />}
      {tab === "booking" && <BookingTab />}
      {tab === "whatsapp" && <WhatsAppTab />}
      {tab === "billing" && <BillingTab />}
    </div>
  );
}
