import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeService } from "@/lib/serialize";
import ServicesClient from "@/components/dashboard/ServicesClient";

export default async function ServicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "Service") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
        style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>You don&apos;t have access to this page</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
          Managing services is limited to owners and management staff.
        </p>
      </div>
    );
  }

  const services = await db.service.findMany({
    where: { vendorId: session.vendorId },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return <ServicesClient initialServices={services.map(serializeService)} />;
}
