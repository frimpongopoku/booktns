import Link from "next/link";
import Logo from "@/components/shared/Logo";

interface StorefrontNavProps {
  slug: string;
  vendorName: string;
}

export default function StorefrontNav({ slug, vendorName }: StorefrontNavProps) {
  return (
    <header
      className="hidden md:flex items-center justify-between px-8 py-4 sticky top-0 z-30"
      style={{
        background: "var(--bg)",
        borderBottom: "1px solid var(--bd)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Link
        href={`/${slug}`}
        className="font-display text-lg font-medium"
        style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
      >
        {vendorName}
      </Link>

      <nav className="flex items-center gap-6 text-sm" style={{ color: "var(--tx2)" }}>
        <Link href={`/${slug}`} className="hover:text-[var(--tx)] transition-colors">
          Home
        </Link>
        <Link href={`/${slug}#services`} className="hover:text-[var(--tx)] transition-colors">
          Services
        </Link>
        <Link href={`/${slug}/shop`} className="hover:text-[var(--tx)] transition-colors">
          Shop
        </Link>
        <Link href={`/${slug}/pay`} className="hover:text-[var(--tx)] transition-colors">
          Pay
        </Link>
      </nav>

      <Link
        href={`/${slug}/book`}
        className="px-4 py-2 rounded-[var(--r)] text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--ac)" }}
      >
        Book Now
      </Link>
    </header>
  );
}
