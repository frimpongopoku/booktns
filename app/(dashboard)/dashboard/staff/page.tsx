"use client";

import { useState } from "react";
import { staff as initialStaff } from "@/lib/data";
import type { Staff, StaffRole } from "@/types";
import Topbar from "@/components/dashboard/Topbar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Plus, X, MessageCircle } from "lucide-react";

const ROLE_LABELS: Record<StaffRole, string> = {
  Owner: "Owner",
  Management: "Management",
  Service: "Service",
};

const ROLE_DOT_COLORS: Record<StaffRole, string> = {
  Owner: "var(--ac)",
  Management: "#6366F1",
  Service: "var(--green)",
};

function RoleChip({ role }: { role: StaffRole }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium"
      style={{ background: "var(--bg3)", color: "var(--tx2)", border: "1px solid var(--bds)", borderRadius: "6px" }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ROLE_DOT_COLORS[role] }} />
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium"
      style={{ background: "var(--bg3)", color: active ? "var(--green)" : "var(--tx3)", border: "1px solid var(--bds)", borderRadius: "6px" }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? "var(--green)" : "var(--tx3)" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

interface AddStaffModalProps {
  onClose: () => void;
  onAdd: (s: Staff) => void;
}

function AddStaffModal({ onClose, onAdd }: AddStaffModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("Service");
  const [roleDetail, setRoleDetail] = useState("");
  const [botAccess, setBotAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const close = () => { setIsExiting(true); setTimeout(onClose, 210); };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onAdd({
      id: `s${Date.now()}`,
      vendorId: "v1",
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role,
      roleDetail: roleDetail.trim() || undefined,
      botAccess,
      active: true,
      serviceCategories: [],
    });
    close();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isExiting ? "anim-fade-out" : "anim-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.4)" }}
    >
      <div
        className={`w-full max-w-md rounded-[var(--rl)] overflow-hidden ${isExiting ? "anim-scale-out" : "anim-scale-in"}`}
        style={{ background: "var(--bg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--bd)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--tx)" }}>
            Add Staff Member
          </h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-[var(--bg3)] transition-colors" style={{ color: "var(--tx3)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <Input label="Full name" placeholder="e.g. Chioma Okafor" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Email"
            type="email"
            placeholder="chioma@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Becomes their Google Sign-In login — they must sign in with this exact address"
          />
          <Input label="Phone number (optional)" type="tel" placeholder="+234 800 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--tx2)" }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="px-3 py-2 rounded-[var(--r)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ac)]"
              style={{ background: "var(--bg2)", color: "var(--tx)", border: "1px solid var(--bd)" }}
            >
              <option value="Owner">Owner</option>
              <option value="Management">Management</option>
              <option value="Service">Service</option>
            </select>
          </div>
          {role === "Service" && (
            <Input
              label="Speciality (optional)"
              placeholder="e.g. Hair, Nails"
              value={roleDetail}
              onChange={(e) => setRoleDetail(e.target.value)}
            />
          )}
          <div className="flex items-center justify-between p-3 rounded-[var(--r)]" style={{ background: "var(--bg2)" }}>
            <div className="flex items-center gap-2">
              <MessageCircle size={16} style={{ color: "var(--green)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>Bot access</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>Can manage bookings via WhatsApp</p>
              </div>
            </div>
            <button
              onClick={() => setBotAccess((v) => !v)}
              className="w-10 h-6 rounded-full transition-colors relative"
              style={{ background: botAccess ? "var(--green)" : "var(--bg3)" }}
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ left: botAccess ? "calc(100% - 18px)" : "2px" }}
              />
            </button>
          </div>
        </div>
        <div
          className="flex gap-3 px-5 py-4"
          style={{ borderTop: "1px solid var(--bd)" }}
        >
          <Button variant="secondary" onClick={close} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleSubmit} className="flex-1" disabled={!name.trim() || !email.trim()}>
            Add Staff
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [showAddModal, setShowAddModal] = useState(false);
  const [botAccess, setBotAccess] = useState<Record<string, boolean>>(
    Object.fromEntries(initialStaff.map((s) => [s.id, s.botAccess]))
  );

  const toggleBot = (id: string) => {
    setBotAccess((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <Topbar
        title="Staff"
        subtitle={`${staffList.filter((s) => s.active).length} active members`}
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Add Staff
          </Button>
        }
      />

      <div
        className="rounded-[var(--rl)] overflow-hidden"
        style={{ border: "1px solid var(--bds)" }}
      >
        {/* Header */}
        <div
          className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr] gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{ background: "var(--bg2)", color: "var(--tx3)" }}
        >
          <span>Name</span>
          <span>Role</span>
          <span>Email</span>
          <span>Bot</span>
          <span>Status</span>
        </div>

        <div className="flex flex-col gap-0.5 p-2" style={{ background: "var(--bg)" }}>
          {staffList.map((member) => (
            <div
              key={member.id}
              className="grid md:grid-cols-[2fr_1fr_1.5fr_1fr_1fr] gap-3 md:gap-4 px-3 py-3.5 rounded-lg hover:bg-[var(--bg2)] transition-colors items-center"
            >
              {/* Name */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                  style={{ background: "var(--ac)" }}
                >
                  {member.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
                    {member.name}
                  </p>
                  {member.roleDetail && (
                    <p className="text-xs" style={{ color: "var(--tx3)" }}>
                      {member.roleDetail}
                    </p>
                  )}
                </div>
              </div>

              {/* Role */}
              <RoleChip role={member.role} />

              {/* Email */}
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                {member.email}
              </p>

              {/* Bot toggle */}
              <button
                onClick={() => toggleBot(member.id)}
                className="w-10 h-6 rounded-full transition-colors relative"
                style={{ background: botAccess[member.id] ? "var(--green)" : "var(--bg3)" }}
                title={botAccess[member.id] ? "Bot access on" : "Bot access off"}
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ left: botAccess[member.id] ? "calc(100% - 18px)" : "2px" }}
                />
              </button>

              {/* Status */}
              <StatusChip active={member.active} />
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onAdd={(s) => setStaffList((prev) => [...prev, s])}
        />
      )}
    </div>
  );
}
