import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSuperAdminSession } from "@/lib/superadmin-auth";
import AdminsClient from "@/components/superadmin/AdminsClient";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  // The route-group layout already gates this; re-read here only because the
  // page needs the current admin's id to stop them removing themselves.
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const admins = await db.superAdmin.findMany({ orderBy: { invitedAt: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>
          Administrators
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
          Anyone listed here can sign in to this console with their Google account. There is no
          sign-up — adding an email here is what grants access.
        </p>
      </div>

      <AdminsClient
        currentAdminId={session.sub}
        admins={admins.map((admin) => ({
          id: admin.id,
          email: admin.email,
          name: admin.name,
          invitedAt: admin.invitedAt.toISOString(),
          acceptedAt: admin.acceptedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
