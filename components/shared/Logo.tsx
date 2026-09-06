import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  href?: string;
}

export default function Logo({ size = "md", href = "/" }: LogoProps) {
  const sizes = {
    sm: { text: "text-base", mark: 20 },
    md: { text: "text-lg", mark: 24 },
    lg: { text: "text-2xl", mark: 30 },
  };

  const s = sizes[size];

  const inner = (
    <span
      className={`font-semibold tracking-tight ${s.text} flex items-center gap-1.5`}
      style={{ color: "var(--tx)", letterSpacing: "-0.03em" }}
    >
      {/* Same mark as the favicon/app icon (lib/og-image.tsx's
          renderIconMark) — a bold "B" on the brand gradient chip, so the
          mark is identical everywhere Booktns shows up rather than this
          being its own one-off. */}
      <span
        aria-hidden="true"
        className="flex items-center justify-center font-bold"
        style={{
          flexShrink: 0,
          width: s.mark,
          height: s.mark,
          borderRadius: s.mark * 0.22,
          background: "linear-gradient(135deg, var(--ac), var(--ac2))",
          color: "#fff",
          fontSize: s.mark * 0.56,
          lineHeight: 1,
        }}
      >
        B
      </span>
      booktns
    </span>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return inner;
}
