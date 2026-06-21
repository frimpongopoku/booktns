import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorBySlug, paymentMethods } from "@/lib/data";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";
import { CopyButton } from "@/components/ui/CopyButton";
import { Smartphone, CreditCard, Banknote, MapPin } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function PaymentIcon({ type }: { type: string }) {
  if (type === "momo") return <Smartphone size={20} style={{ color: "#F59E0B" }} />;
  if (type === "bank") return <CreditCard size={20} style={{ color: "#2563EB" }} />;
  return <Banknote size={20} style={{ color: "var(--green)" }} />;
}

export default async function PayPage({ params }: PageProps) {
  const { slug } = await params;
  const vendorData = getVendorBySlug(slug);
  if (!vendorData) notFound();

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <Link
          href={`/${slug}`}
          className="font-display text-lg font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
        >
          {vendorData.name}
        </Link>
        <Link href={`/${slug}/book`} className="text-sm font-medium" style={{ color: "var(--ac)" }}>
          Book Now
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Vendor avatar */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-white mx-auto mb-4"
            style={{ background: "var(--ac)" }}
          >
            G
          </div>
          <h1
            className="font-display text-2xl font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            {vendorData.name}
          </h1>
          <div className="flex items-center justify-center gap-1.5">
            <MapPin size={12} style={{ color: "var(--tx3)" }} />
            <p className="text-sm" style={{ color: "var(--tx3)" }}>
              {vendorData.location}
            </p>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: "var(--tx3)" }}>
          Payment Details
        </p>

        <div className="flex flex-col gap-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="p-5 rounded-[var(--rl)]"
              style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-[var(--r)] flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg3)" }}
                >
                  <PaymentIcon type={pm.type} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{pm.label}</p>
                  {pm.bankName && <p className="text-xs" style={{ color: "var(--tx3)" }}>{pm.bankName}</p>}
                </div>
              </div>

              {pm.type !== "cash" ? (
                <div className="flex flex-col gap-2">
                  <div
                    className="flex items-center justify-between p-3 rounded-[var(--r)]"
                    style={{ background: "var(--bg3)" }}
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
                        Account Name
                      </p>
                      <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{pm.accountName}</p>
                    </div>
                    <CopyButton text={pm.accountName} />
                  </div>
                  {pm.accountNumber && (
                    <div
                      className="flex items-center justify-between p-3 rounded-[var(--r)]"
                      style={{ background: "var(--bg3)" }}
                    >
                      <div>
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
                          {pm.type === "momo" ? "MoMo Number" : "Account Number"}
                        </p>
                        <p className="text-lg font-semibold tracking-wider" style={{ color: "var(--tx)" }}>
                          {pm.accountNumber}
                        </p>
                      </div>
                      <CopyButton text={pm.accountNumber} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--tx2)" }}>
                  Pay when you arrive at the salon. Please come with exact change where possible.
                </p>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "var(--tx3)" }}>
          After paying, send your receipt to{" "}
          <a
            href={`https://wa.me/${vendorData.whatsapp.replace("+", "")}`}
            className="font-medium"
            style={{ color: "var(--green)" }}
          >
            WhatsApp
          </a>{" "}
          for confirmation.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center py-6" style={{ borderTop: "1px solid var(--bds)" }}>
        <Link href="/" className="text-xs" style={{ color: "var(--tx3)" }}>
          Powered by{" "}
          <span className="font-medium" style={{ color: "var(--ac)" }}>Booktns</span>
        </Link>
      </div>

      <MobileStorefrontNav slug={slug} />
    </div>
  );
}
