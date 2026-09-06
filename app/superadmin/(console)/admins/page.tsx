import { redirect } from "next/navigation";
import { getSuperAdminSession, apiSuperAdminOrRedirect } from "@/lib/superadmin-auth";
import AdminsClient, { type AdminRow } from "@/components/superadmin/AdminsClient";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  // The route-group layout already gates this; re-read here only because the
  // page needs the current admin's id to stop them removing themselves.
  const session = await getSuperAdminSession();
  if (!session) redirect("/superadmin/login");

  const { admins } = await apiSuperAdminOrRedirect<{ admins: AdminRow[] }>("/superadmin/admins");

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

      {/* Dates already arrive as ISO strings — this is a JSON API response,
          not a Prisma row, so no .toISOString() call is needed here. */}
      <AdminsClient currentAdminId={session.sub} admins={admins} />
    </div>
  );
}
