import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import { SITE_URL } from "@/lib/site";
import PaymentsClient from "@/components/dashboard/PaymentsClient";
import type { PaymentMethod, Vendor } from "@/types";

// Payment details are Owner-only, matching the guard on every
// /payment-methods route (@Roles("Owner")) and spec §7.4's "Payment
// settings" row. This page inherited that rule from the Settings tab it
// was lifted out of.
export const metadata: Metadata = { title: "Payments" };

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

  const [{ paymentMethods }, { vendor }, domain] = await Promise.all([
    apiServer<{ paymentMethods: PaymentMethod[] }>("/payment-methods"),
    apiServer<{ vendor: Vendor }>("/vendor"),
    // Same rule as Settings > Booking link: hand out the vendor's own
    // domain only once it's actually verified, or the link is dead on
    // arrival.
    apiServer<{ domain: string | null; verified: boolean }>("/vendor/domain"),
  ]);

  const isCustomDomain = Boolean(domain.domain && domain.verified);
  const storefrontOrigin = isCustomDomain ? `https://${domain.domain}` : SITE_URL;
  const payUrl = isCustomDomain ? `${storefrontOrigin}/pay` : `${storefrontOrigin}/${vendor.slug}/pay`;

  return (
    <PaymentsClient
      initialPaymentMethods={paymentMethods}
      vendorName={vendor.name}
      payUrl={payUrl}
      storefrontPublished={vendor.storefrontPublished}
    />
  );
}
