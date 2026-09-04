import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import PaymentsClient from "@/components/dashboard/PaymentsClient";
import type { PaymentMethod } from "@/types";

// Payment details are Owner-only, matching the guard on every
// /payment-methods route (@Roles("Owner")) and spec §7.4's "Payment
// settings" row. This page inherited that rule from the Settings tab it
// was lifted out of.
export default async function PaymentsPage() {
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
          Payment details are limited to the business owner.
        </p>
      </div>
    );
  }

  const { paymentMethods } = await apiServer<{ paymentMethods: PaymentMethod[] }>("/payment-methods");

  return <PaymentsClient initialPaymentMethods={paymentMethods} />;
}
