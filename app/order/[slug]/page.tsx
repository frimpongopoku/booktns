import type { Metadata } from "next";
import Link from "next/link";
import PlatformCredit from "@/components/shared/PlatformCredit";
import { notFound } from "next/navigation";
import { getOrderBySlug } from "@/lib/orders";
import { apiUrl } from "@/lib/api-client";
import { formatPrice } from "@/lib/data";
import { CopyButton } from "@/components/ui/CopyButton";
import VendorContactCard from "@/components/storefront/VendorContactCard";
import VendorWordmark from "@/components/storefront/VendorWordmark";
import StartYourOwnShopLink from "@/components/shared/StartYourOwnShopLink";
import type { VendorContactInfo } from "@/lib/vendor-contact";
import {
  PackageCheck,
  Download,
  Smartphone,
  CreditCard,
  Banknote,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { month: "long", day: "numeric", year: "numeric" });
}

function PaymentIcon({ type }: { type: string }) {
  if (type === "momo") return <Smartphone size={16} style={{ color: "#F59E0B" }} />;
  if (type === "bank") return <CreditCard size={16} style={{ color: "#2563EB" }} />;
  return <Banknote size={16} style={{ color: "var(--green)" }} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const order = await getOrderBySlug(slug);
  if (!order) {
    return {
      title: "Order Confirmation",
      alternates: { canonical: `/order/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  const description = `${order.ref} · ${order.items.length} item${order.items.length === 1 ? "" : "s"} from ${order.vendor.name}`;

  return {
    title: `Order Confirmation — ${order.vendor.name}`,
    description,
    alternates: { canonical: `/order/${slug}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: `Order at ${order.vendor.name}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Order at ${order.vendor.name}`,
      description,
    },
  };
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { slug } = await params;

  const order = await getOrderBySlug(slug);
  if (!order) notFound();

  const contact: VendorContactInfo = {
    name: order.vendor.name,
    slug: order.vendor.slug,
    location: order.vendor.location,
    hours: order.vendor.hours,
    phone: order.vendor.phone,
    whatsapp: order.vendor.whatsapp,
    personalWhatsappNumber: order.vendor.personalWhatsappNumber,
    ownerPhone: order.vendor.ownerPhone,
    ownerEmail: order.vendor.ownerEmail,
  };

  const whatsappMessage = `Hi ${order.vendor.name}, I placed order ${order.ref}. Customer: ${order.customerName}.`;

  const subtotal = order.items.reduce((s, item) => s + item.priceSnapshot * item.quantity, 0);

  return (
    // Same vendor accent scope as the storefront and the booking
    // confirmation — see app/[slug]/layout.tsx.
    <div
      data-storefront-theme={order.vendor.storefrontTheme}
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 flex items-center justify-center"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        {/* The vendor's own identity, not the Booktns wordmark — this page is
            the customer's record of an order placed with *them*. */}
        <VendorWordmark
          name={order.vendor.name}
          href={`/${order.vendor.slug}`}
          logoUrl={order.vendor.logoUrl}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Status */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--green-bg)" }}
          >
            <PackageCheck size={32} style={{ color: "var(--green)" }} />
          </div>
          <p
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-3"
            style={{ background: "var(--green-bg)", color: "var(--green)" }}
          >
            Order Received
          </p>
          <h1
            className="font-display text-2xl font-medium"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            {order.ref}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--tx3)" }}>
            {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Customer */}
          <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>Customer</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                style={{ background: "var(--ac)" }}
              >
                {order.customerName[0]}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--tx)" }}>{order.customerName}</p>
                <p className="text-xs" style={{ color: "var(--tx3)" }}>{order.customerPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--bds)" }}>
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>Preference</p>
                <p className="text-sm" style={{ color: "var(--tx2)" }}>{order.deliveryPreference}</p>
              </div>
              {order.notes && (
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>Notes</p>
                  <p className="text-sm truncate" style={{ color: "var(--tx2)" }}>{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>Items</p>
            <div className="flex flex-col gap-2">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] font-semibold uppercase tracking-wide pb-2" style={{ color: "var(--tx3)", borderBottom: "1px solid var(--bds)" }}>
                <span>Item</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price</span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <span className="text-sm" style={{ color: "var(--tx)" }}>{item.name}</span>
                  <span className="text-sm text-right" style={{ color: "var(--tx3)" }}>×{item.quantity}</span>
                  <span className="text-sm font-medium text-right" style={{ color: "var(--tx2)" }}>
                    {formatPrice(item.priceSnapshot * item.quantity)}
                  </span>
                </div>
              ))}
              <div
                className="pt-2 mt-1 flex flex-col gap-1"
                style={{ borderTop: "1px solid var(--bds)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--tx3)" }}>Subtotal</span>
                  <span className="text-sm" style={{ color: "var(--tx2)" }}>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--tx)" }}>Total</span>
                  <span
                    className="font-display text-xl font-medium"
                    style={{ fontFamily: "var(--font-display)", color: "var(--ac)" }}
                  >
                    {formatPrice(order.totalPesewas)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment details */}
          <div className="p-4 rounded-[var(--rl)]" style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--tx3)" }}>Pay via</p>
            {order.paymentMethod ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-[var(--r)] flex items-center justify-center"
                    style={{ background: "var(--bg3)" }}
                  >
                    <PaymentIcon type={order.paymentMethod.type} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{order.paymentMethod.label}</p>
                </div>
                {order.paymentMethod.accountNumber && (
                  <div
                    className="flex items-center justify-between p-3 rounded-[var(--r)]"
                    style={{ background: "var(--bg3)" }}
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>
                        {order.paymentMethod.type === "momo" ? "MoMo Number" : "Account Number"}
                      </p>
                      <p className="text-base font-bold tracking-wider" style={{ color: "var(--tx)" }}>
                        {order.paymentMethod.accountNumber}
                      </p>
                    </div>
                    <CopyButton text={order.paymentMethod.accountNumber} />
                  </div>
                )}
                <div
                  className="flex items-center justify-between p-3 rounded-[var(--r)] mt-2"
                  style={{ background: "var(--bg3)" }}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--tx3)" }}>Account Name</p>
                    <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>{order.paymentMethod.accountName}</p>
                  </div>
                  <CopyButton text={order.paymentMethod.accountName} />
                </div>
                <p className="text-xs mt-3" style={{ color: "var(--tx3)" }}>
                  Send{" "}
                  <span className="font-bold" style={{ color: "var(--tx)" }}>
                    {formatPrice(order.totalPesewas)}
                  </span>{" "}
                  and send your receipt to WhatsApp.
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                See{" "}
                <Link href={`/${order.vendor.slug}/pay`} className="underline" style={{ color: "var(--ac)" }}>
                  {order.vendor.name}&apos;s payment options
                </Link>{" "}
                and send your receipt to WhatsApp.
              </p>
            )}
          </div>

          {/* Every way of reaching the vendor, anchored at #contact so an
              order email's "reach out to them directly" can link straight
              here — the customer has no account, so this page is their
              record. */}
          <VendorContactCard id="contact" contact={contact} whatsappMessage={whatsappMessage} className="mt-2" />

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-2">
            {/* Plain link, not a fetch — the route builds the PDF on first
                request then redirects to it on R2, so this works on the very
                first click without the page having to poll for it. */}
            <a
              href={apiUrl(`/orders/by-slug/${order.slug}/pdf`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 rounded-[var(--r)] text-sm font-medium"
              style={{ background: "var(--bg2)", color: "var(--tx2)" }}
            >
              <Download size={15} />
              Download receipt (PDF)
            </a>
          </div>

          <div className="text-center pt-2">
            <Link href={`/${order.vendor.slug}/shop`} className="text-sm" style={{ color: "var(--tx3)" }}>
              ← Back to shop
            </Link>
          </div>
        </div>
      </div>

      <footer
        className="mt-auto px-4 py-6 flex flex-col items-center gap-3 text-center"
        style={{ borderTop: "1px solid var(--bds)" }}
      >
        <StartYourOwnShopLink variant="card" className="w-full max-w-sm" />
        <Link href="/" className="text-xs" style={{ color: "var(--tx3)" }}>
          Powered by{" "}
          <span className="font-medium" style={{ color: "var(--ac)" }}>Booktns</span>
        </Link>
        <PlatformCredit className="justify-center" />
      </footer>
    </div>
  );
}
