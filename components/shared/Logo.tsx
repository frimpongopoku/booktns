import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
}

export default function Logo({ size = "md", href = "/" }: LogoProps) {
  const sizes = {
    sm: { text: "text-lg", dot: "w-1.5 h-1.5" },
    md: { text: "text-xl", dot: "w-2 h-2" },
    lg: { text: "text-3xl", dot: "w-2.5 h-2.5" },
  };

  const s = sizes[size];

  const inner = (
    <span className={`font-display font-medium tracking-tight ${s.text} flex items-center gap-1`}
      style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}>
      <span style={{ color: "var(--ac)" }}>Book</span>
      <span>tns</span>
      <span className={`rounded-full inline-block ${s.dot} mb-0.5`}
        style={{ background: "var(--ac)" }} />
    </span>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}
