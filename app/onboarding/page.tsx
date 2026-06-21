"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/shared/Logo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Input";
import {
  Check,
  Plus,
  X,
  Rocket,
  ExternalLink,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

const STEPS = [
  "Business Info",
  "Add Services",
  "Add Staff",
  "Payment",
  "Go Live",
];

interface ServiceEntry {
  name: string;
  duration: string;
  price: string;
  category: string;
}

interface StaffEntry {
  name: string;
  phone: string;
  role: string;
}

interface PaymentEntry {
  type: string;
  label: string;
  number: string;
  name: string;
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300"
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 99,
            background: i < current ? "var(--green)" : i === current ? "var(--ac)" : "var(--bds)",
          }}
        />
      ))}
    </div>
  );
}

// Step 1: Business Info
function BusinessInfoStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("Mon–Sat 9am–7pm");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSlugify = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, ""));
  };

  const handleNext = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      <Input label="Business name" placeholder="e.g. Glam by Rose" value={name} onChange={(e) => handleSlugify(e.target.value)} />
      <Input
        label="Storefront URL slug"
        placeholder="glambyrose"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        hint={slug ? `booktns.com/${slug}` : undefined}
      />
      <Textarea label="Description" placeholder="Tell customers what makes you special…" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      <Input label="Location" placeholder="e.g. Lekki Phase 1, Lagos" value={location} onChange={(e) => setLocation(e.target.value)} />
      <Input label="Business hours" placeholder="Mon–Sat 9am–7pm" value={hours} onChange={(e) => setHours(e.target.value)} />
      <Input label="Contact phone / WhatsApp" type="tel" placeholder="+234 800 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button size="lg" loading={loading} onClick={handleNext} disabled={!name.trim()} className="mt-2">
        Continue
      </Button>
    </div>
  );
}

// Step 2: Add Services
function AddServicesStep({ onNext }: { onNext: () => void }) {
  const [services, setServices] = useState<ServiceEntry[]>([
    { name: "", duration: "60", price: "", category: "Hair" },
  ]);
  const [loading, setLoading] = useState(false);

  const addService = () => {
    setServices((prev) => [...prev, { name: "", duration: "60", price: "", category: "Hair" }]);
  };

  const removeService = (i: number) => {
    setServices((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateService = (i: number, field: keyof ServiceEntry, value: string) => {
    setServices((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const handleNext = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      {services.map((svc, i) => (
        <div
          key={i}
          className="p-4 rounded-[var(--rl)] relative"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          {services.length > 1 && (
            <button
              onClick={() => removeService(i)}
              className="absolute top-3 right-3"
              style={{ color: "var(--tx3)" }}
            >
              <X size={14} />
            </button>
          )}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Service name" placeholder="e.g. Knotless Braids" value={svc.name} onChange={(e) => updateService(i, "name", e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Category</label>
                <select
                  value={svc.category}
                  onChange={(e) => updateService(i, "category", e.target.value)}
                  className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none"
                  style={{ background: "var(--bg3)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                >
                  {["Hair", "Nails", "Skin", "Lashes", "Brows", "Other"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Duration (mins)" type="number" value={svc.duration} onChange={(e) => updateService(i, "duration", e.target.value)} />
              <Input label="Price (GH₵)" type="number" placeholder="0" value={svc.price} onChange={(e) => updateService(i, "price", e.target.value)} />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addService}
        className="flex items-center gap-2 text-sm font-medium"
        style={{ color: "var(--ac)" }}
      >
        <Plus size={14} />
        Add another service
      </button>

      <div className="flex gap-3 mt-2">
        <Button variant="ghost" size="lg" onClick={handleNext} className="flex-1">
          Skip for now
        </Button>
        <Button size="lg" loading={loading} onClick={handleNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}

// Step 3: Add Staff
function AddStaffStep({ onNext }: { onNext: () => void }) {
  const [staffList, setStaffList] = useState<StaffEntry[]>([
    { name: "", phone: "", role: "Owner" },
  ]);
  const [loading, setLoading] = useState(false);

  const addStaff = () => setStaffList((prev) => [...prev, { name: "", phone: "", role: "Service" }]);
  const removeStaff = (i: number) => setStaffList((prev) => prev.filter((_, idx) => idx !== i));
  const updateStaff = (i: number, field: keyof StaffEntry, val: string) =>
    setStaffList((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

  const handleNext = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      {staffList.map((member, i) => (
        <div
          key={i}
          className="p-4 rounded-[var(--rl)] relative"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          {staffList.length > 1 && (
            <button onClick={() => removeStaff(i)} className="absolute top-3 right-3" style={{ color: "var(--tx3)" }}>
              <X size={14} />
            </button>
          )}
          <div className="flex flex-col gap-3">
            <Input label="Full name" placeholder="e.g. Chioma Okafor" value={member.name} onChange={(e) => updateStaff(i, "name", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone" type="tel" placeholder="+234..." value={member.phone} onChange={(e) => updateStaff(i, "phone", e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Role</label>
                <select
                  value={member.role}
                  onChange={(e) => updateStaff(i, "role", e.target.value)}
                  className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none"
                  style={{ background: "var(--bg3)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                >
                  {["Owner", "Management", "Service"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button onClick={addStaff} className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ac)" }}>
        <Plus size={14} />
        Add another staff member
      </button>
      <div className="flex gap-3 mt-2">
        <Button variant="ghost" size="lg" onClick={handleNext} className="flex-1">Skip</Button>
        <Button size="lg" loading={loading} onClick={handleNext} className="flex-1">Continue</Button>
      </div>
    </div>
  );
}

// Step 4: Payment Methods
function PaymentStep({ onNext }: { onNext: () => void }) {
  const [methods, setMethods] = useState<PaymentEntry[]>([
    { type: "momo", label: "MTN MoMo", number: "", name: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const addMethod = () => setMethods((prev) => [...prev, { type: "bank", label: "", number: "", name: "" }]);
  const removeMethod = (i: number) => setMethods((prev) => prev.filter((_, idx) => idx !== i));
  const updateMethod = (i: number, field: keyof PaymentEntry, val: string) =>
    setMethods((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: val } : m)));

  const handleNext = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: "var(--tx2)" }}>
        Add payment methods so customers know how to pay you.
      </p>
      {methods.map((pm, i) => (
        <div
          key={i}
          className="p-4 rounded-[var(--rl)] relative"
          style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
        >
          {methods.length > 1 && (
            <button onClick={() => removeMethod(i)} className="absolute top-3 right-3" style={{ color: "var(--tx3)" }}>
              <X size={14} />
            </button>
          )}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Type</label>
                <select
                  value={pm.type}
                  onChange={(e) => updateMethod(i, "type", e.target.value)}
                  className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none"
                  style={{ background: "var(--bg3)", color: "var(--tx)", border: "1px solid var(--bd)" }}
                >
                  <option value="momo">Mobile Money</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash on Arrival</option>
                </select>
              </div>
              <Input label="Label" placeholder="e.g. MTN MoMo" value={pm.label} onChange={(e) => updateMethod(i, "label", e.target.value)} />
            </div>
            {pm.type !== "cash" && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Account name" placeholder="Full name" value={pm.name} onChange={(e) => updateMethod(i, "name", e.target.value)} />
                <Input label={pm.type === "momo" ? "MoMo number" : "Account number"} value={pm.number} onChange={(e) => updateMethod(i, "number", e.target.value)} />
              </div>
            )}
          </div>
        </div>
      ))}
      <button onClick={addMethod} className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--ac)" }}>
        <Plus size={14} />
        Add payment method
      </button>
      <div className="flex gap-3 mt-2">
        <Button variant="ghost" size="lg" onClick={handleNext} className="flex-1">Skip</Button>
        <Button size="lg" loading={loading} onClick={handleNext} className="flex-1">Continue</Button>
      </div>
    </div>
  );
}

// Step 5: Go Live
function GoLiveStep() {
  return (
    <div className="text-center">
      {/* Confetti-style visual */}
      <div className="relative flex items-center justify-center mb-8 h-24">
        {["🎉", "✨", "🌸", "⭐", "🎊"].map((emoji, i) => (
          <span
            key={i}
            className="absolute text-2xl"
            style={{
              transform: `rotate(${i * 72}deg) translateY(-40px)`,
              animation: `none`,
            }}
          >
            {emoji}
          </span>
        ))}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center z-10"
          style={{ background: "var(--green-bg)" }}
        >
          <Rocket size={28} style={{ color: "var(--green)" }} />
        </div>
      </div>

      <h2
        className="font-display text-2xl font-medium mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
      >
        Your storefront is live!
      </h2>
      <p className="text-sm mb-8" style={{ color: "var(--tx2)" }}>
        Share your link with clients and start taking bookings.
      </p>

      <div
        className="flex items-center gap-3 p-3 rounded-[var(--r)] mb-6"
        style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
      >
        <p className="text-sm flex-1 text-left truncate" style={{ color: "var(--tx2)" }}>
          booktns.com/<span style={{ color: "var(--ac)" }}>yourslug</span>
        </p>
        <button
          className="text-xs font-medium px-3 py-1.5 rounded-[var(--r)]"
          style={{ background: "var(--bg3)", color: "var(--tx)" }}
          onClick={() => {}}
        >
          Copy
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/glambyrose"
          className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium text-white"
          style={{ background: "var(--ac)" }}
        >
          <ExternalLink size={15} />
          View my storefront
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium"
          style={{ background: "var(--bg3)", color: "var(--tx)" }}
        >
          <LayoutDashboard size={15} />
          Go to dashboard
        </Link>
      </div>

      <div className="mt-8 p-4 rounded-[var(--rl)] text-left" style={{ background: "var(--ac-bg)", border: "1px solid var(--ac)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} style={{ color: "var(--ac)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--ac)" }}>Pro tip</p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--ac2)" }}>
          Share your storefront link in your Instagram bio, WhatsApp status, and on Google Maps to start getting bookings.
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="md" href="/" />
          <div className="mt-6 mb-4">
            <StepDots current={step} total={STEPS.length} />
          </div>
          <div className="text-center">
            <p className="text-xs" style={{ color: "var(--tx3)" }}>
              Step {step + 1} of {STEPS.length}
            </p>
            <h1
              className="font-display text-xl font-medium mt-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
            >
              {STEPS[step]}
            </h1>
          </div>
        </div>

        {/* Step content */}
        {step === 0 && <BusinessInfoStep onNext={goNext} />}
        {step === 1 && <AddServicesStep onNext={goNext} />}
        {step === 2 && <AddStaffStep onNext={goNext} />}
        {step === 3 && <PaymentStep onNext={goNext} />}
        {step === 4 && <GoLiveStep />}

        {/* Completed steps indicator */}
        {step < 4 && (
          <div className="mt-6 flex flex-col gap-1">
            {STEPS.slice(0, step).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--green-bg)" }}
                >
                  <Check size={10} style={{ color: "var(--green)" }} />
                </div>
                <span className="text-xs" style={{ color: "var(--tx3)" }}>{s} done</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
