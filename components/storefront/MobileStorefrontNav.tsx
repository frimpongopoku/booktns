"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Scissors, ShoppingBag, CreditCard } from "lucide-react";

interface MobileStorefrontNavProps {
  slug: string;
}

export default function MobileStorefrontNav({ slug }: MobileStorefrontNavProps) {
  const pathname = usePathname();

  const items = [
    { label: "Home", href: `/${slug}`, icon: Home },
    { label: "Services", href: `/${slug}#services`, icon: Scissors },
    { label: "Shop", href: `/${slug}/shop`, icon: ShoppingBag },
    { label: "Pay", href: `/${slug}/pay`, icon: CreditCard },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        background: "var(--bg2)",
        borderTop: "1px solid var(--bd)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((item) => {
        const active = pathname === item.href || (item.href.includes("#") && false);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: active ? "var(--ac)" : "var(--tx3)" }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
