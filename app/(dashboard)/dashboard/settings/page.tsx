import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const businessHours = await db.businessHours.findMany({
    where: { vendorId: session.vendorId },
    orderBy: { dayOfWeek: "asc" },
  });

  return <SettingsClient businessHours={businessHours} />;
}
