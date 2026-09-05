import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefrontVendor } from "@/lib/vendors";
import { isRequestFromCustomDomain } from "@/lib/request-context";
import { storefrontHref } from "@/lib/storefront-links";
import MobileStorefrontNav from "@/components/storefront/MobileStorefrontNav";
import VendorWordmark from "@/components/storefront/VendorWordmark";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import WhatsAppContactLink from "@/components/storefront/WhatsAppContactLink";
import TrackView from "@/components/storefront/TrackView";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { CopyButton } from "@/components/ui/CopyButton";
import { Smartphone, CreditCard, Banknote, MapPin, BadgeCheck, ShieldAlert } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendorData = await getStorefrontVendor(slug);
  const title = vendorData ? `Payment — ${vendorData.name}` : "Payment Details";

  return {
    title,
    alternates: { canonical: `/${slug}/pay` },
    robots: { index: false, follow: true },
  };
}

function PaymentIcon({ type }: { type: string }) {
  if (type === "momo") return <Smartphone size={20} style={{ color: "#F59E0B" }} />;
  if (type === "bank") return <CreditCard size={20} style={{ color: "#2563EB" }} />;
  return <Banknote size={20} style={{ color: "var(--green)" }} />;
}

export default async function PayPage({ params }: PageProps) {
  const { slug } = await params;
  const isCustomDomain = await isRequestFromCustomDomain();
  const vendorData = await getStorefrontVendor(slug);
  if (!vendorData) notFound();

  const isVerified = vendorData.verificationStatus === "VERIFIED";

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0" style={{ background: "var(--bg)" }}>
      <TrackView
        event={ANALYTICS_EVENTS.payPageViewed}
        properties={{ payment_method_count: vendorData.paymentMethods.length }}
      />

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <VendorWordmark
          name={vendorData.name}
          href={storefrontHref(slug, isCustomDomain)}
          logoUrl={vendorData.logoUrl}
        />
        <Link href={storefrontHref(slug, isCustomDomain, "/book")} className="text-base font-medium" style={{ color: "var(--ac)" }}>
          Book Now
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Vendor avatar */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-semibold text-white mx-auto mb-4"
            style={{ background: "var(--ac)" }}
          >
            {vendorData.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendorData.logoUrl} alt={`${vendorData.name} logo`} className="w-full h-full object-cover" />
            ) : (
              vendorData.name[0]
            )}
          </div>
          <h1
            className="font-display text-2xl font-medium mb-1 inline-flex items-center gap-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            {vendorData.name}
            {isVerified && <VerifiedBadge size={18} />}
          </h1>
          <div className="flex items-center justify-center gap-1.5">
            <MapPin size={12} style={{ color: "var(--tx3)" }} />
            <p className="text-base" style={{ color: "var(--tx3)" }}>
              {vendorData.location}
            </p>
          </div>
        </div>

        {/* The single most consequential place the badge appears. A verified
            vendor's panel REPLACES the caution notice rather than sitting
            alongside it — this is the moment a customer is about to send
            money to a stranger, and the two messages would undercut each
            other. */}
        {isVerified ? (
          <div
            className="flex items-start gap-3 p-4 rounded-[var(--rl)] mb-8"
            style={{ background: "var(--green-bg)", border: "1px solid var(--green)" }}
          >
            <BadgeCheck size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--green)" }} />
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--green)" }}>
                Verified vendor
              </p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--tx2)" }}>
                Booktns has checked the identity of the person who runs {vendorData.name} against a
                government ID.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex items-start gap-3 p-4 rounded-[var(--rl)] mb-8"
            style={{ background: "var(--amber-bg)", border: "1px solid var(--amber)" }}
          >
            <ShieldAlert size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--amber)" }} />
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--amber)" }}>
                Before you pay
              </p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--tx2)" }}>
                Booktns hasn&apos;t verified this vendor&apos;s identity, and does not handle or refund
                payments. Money you send goes directly to them. Make sure you know who you&apos;re paying.
              </p>
            </div>
          </div>
        )}

        <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: "var(--tx3)" }}>
          Payment Details
        </p>

        {vendorData.paymentMethods.length === 0 ? (
          <p className="text-base text-center py-6" style={{ color: "var(--tx3)" }}>
            Payment details aren&apos;t set up yet — message us on WhatsApp to arrange payment.
          </p>
        ) : (
        <div className="flex flex-col gap-3">
          {vendorData.paymentMethods.map((pm) => (
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
                  <p className="text-base font-semibold" style={{ color: "var(--tx)" }}>{pm.label}</p>
                  {pm.bankName && <p className="text-sm" style={{ color: "var(--tx3)" }}>{pm.bankName}</p>}
                </div>
              </div>

              {pm.type !== "cash" ? (
                <div className="flex flex-col gap-2">
                  <div
                    className="flex items-center justify-between p-3 rounded-[var(--r)]"
                    style={{ background: "var(--bg3)" }}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
                        Account Name
                      </p>
                      <p className="text-base font-medium" style={{ color: "var(--tx)" }}>{pm.accountName}</p>
                    </div>
                    <CopyButton text={pm.accountName} />
                  </div>
                  {pm.accountNumber && (
                    <div
                      className="flex items-center justify-between p-3 rounded-[var(--r)]"
                      style={{ background: "var(--bg3)" }}
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
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
                <p className="text-base" style={{ color: "var(--tx2)" }}>
                  Pay when you arrive at the salon. Please come with exact change where possible.
                </p>
              )}
            </div>
          ))}
        </div>
        )}

        <p className="text-center text-sm mt-8" style={{ color: "var(--tx3)" }}>
          After paying, send your receipt to{" "}
          <WhatsAppContactLink slug={slug} className="font-medium" style={{ color: "var(--green)" }}>
            WhatsApp
          </WhatsAppContactLink>{" "}
          for confirmation.
        </p>
      </div>

      <StorefrontFooter
        vendorName={vendorData.name}
        verified={vendorData.verificationStatus === "VERIFIED"}
        ownerName={vendorData.ownerName}
        slug={vendorData.slug}
        hasOwnerPhone={Boolean(vendorData.ownerPhone)}
        hasOwnerEmail={Boolean(vendorData.ownerEmail)}
      />

      <MobileStorefrontNav slug={slug} isCustomDomain={isCustomDomain} />
    </div>
  );
}
