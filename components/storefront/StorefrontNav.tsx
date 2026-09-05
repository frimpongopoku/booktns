"use client";

import Link from "next/link";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { storefrontHref } from "@/lib/storefront-links";
import VendorWordmark from "@/components/storefront/VendorWordmark";

interface StorefrontNavProps {
  slug: string;
  vendorName: string;
  vendorLogoUrl?: string;
  isCustomDomain: boolean;
  showVideos: boolean;
  verified: boolean;
}

export default function StorefrontNav({ slug, vendorName, vendorLogoUrl, isCustomDomain, showVideos, verified }: StorefrontNavProps) {
  const href = (path: string = "") => storefrontHref(slug, isCustomDomain, path);

  return (
    <header
      className="hidden md:flex items-center justify-between px-8 py-4 sticky top-0 z-30"
      style={{
        background: "var(--bg)",
        borderBottom: "1px solid var(--bd)",
        backdropFilter: "blur(8px)",
      }}
    >
      <VendorWordmark name={vendorName} href={href()} logoUrl={vendorLogoUrl} verified={verified} />

      <nav className="flex items-center gap-6 text-base" style={{ color: "var(--tx2)" }}>
        <Link href={href()} className="hover:text-[var(--tx)] transition-colors">
          Home
        </Link>
        <Link href={href("#services")} className="hover:text-[var(--tx)] transition-colors">
          Services
        </Link>
        {/* Only rendered when the section it jumps to is actually on the
            page — this nav only ever appears on the storefront home. */}
        {showVideos && (
          <Link href={href("#videos")} className="hover:text-[var(--tx)] transition-colors">
            Videos
          </Link>
        )}
        <Link href={href("/shop")} className="hover:text-[var(--tx)] transition-colors">
          Shop
        </Link>
        <Link href={href("/pay")} className="hover:text-[var(--tx)] transition-colors">
          Pay
        </Link>
        <Link href={href("#contact")} className="hover:text-[var(--tx)] transition-colors">
          Contact
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href={href("/book")}
          className="px-4 py-2 rounded-[var(--r)] text-base font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--ac)" }}
        >
          Book Now
        </Link>
      </div>
    </header>
  );
}
