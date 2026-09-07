import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import StaffClient from "@/components/dashboard/StaffClient";
import type { Staff } from "@/types";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role !== "Owner") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
        style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>You don&apos;t have access to this page</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
          Managing staff is limited to the business owner.
        </p>
      </div>
    );
  }

  const { staff } = await apiServer<{ staff: Staff[] }>("/staff");

  return <StaffClient initialStaff={staff} />;
}
