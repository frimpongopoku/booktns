import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSuperAdminSession, apiSuperAdminOrRedirect } from "@/lib/superadmin-auth";
import SuperAdminShell from "@/components/superadmin/SuperAdminShell";

// The single auth gate for the whole console. Every page under this route
// group is protected by this and nothing else — a new page cannot be added
// unprotected by accident, because there is nowhere else to put it.
export const metadata: Metadata = {
  title: "Superadmin",
  robots: { index: false, follow: false },
};

export default async function SuperAdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/superadmin/login");

  const { overview } = await apiSuperAdminOrRedirect<{ overview: { pendingVerifications: number } }>("/superadmin/overview");
  const pendingVerifications = overview.pendingVerifications;

  return (
    <SuperAdminShell admin={admin} pendingVerifications={pendingVerifications}>
      {children}
    </SuperAdminShell>
  );
}
