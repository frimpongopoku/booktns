import Link from "next/link";

// The company behind Booktns. Same team, same entity named in /privacy and
// /terms — see lib/legal.ts.
const BUILDER_NAME = "Biibisoft Team";
const BUILDER_URL = "https://biibisoft.com";

// Injected at build time by next.config.ts from package.json and the git
// commit count. Read here rather than passed down, so every place this line
// appears reports the same build without anyone having to thread props.
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
const BUILD_NUMBER = process.env.NEXT_PUBLIC_BUILD_NUMBER;

interface PlatformCreditProps {
  // Storefront footers already carry the vendor's own copyright line, so
  // they suppress this one rather than printing two.
  showCopyright?: boolean;
  className?: string;
}

// The single platform credit line used across the storefront, the booking
// flow, the landing page, and the dashboard. Defined once so the wording,
// the version, and the legal links can never drift between surfaces.
export default function PlatformCredit({ showCopyright = true, className = "" }: PlatformCreditProps) {
  return (
    <p
      className={`text-xs flex flex-wrap items-center gap-x-1.5 gap-y-1 ${className}`}
      style={{ color: "var(--tx3)" }}
    >
      <span>
        {showCopyright && <>© {new Date().getFullYear()} Booktns. </>}
        Made for shops across Ghana. Built by the{" "}
        <a
          href={BUILDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[var(--tx2)]"
        >
          {BUILDER_NAME}
        </a>
        .
      </span>
      <span aria-hidden="true">·</span>
      <span>
        v{APP_VERSION} · build {BUILD_NUMBER}
      </span>
      <span aria-hidden="true">·</span>
      <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--tx2)]">
        Privacy
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/terms" className="underline underline-offset-2 hover:text-[var(--tx2)]">
        Terms
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/status" className="underline underline-offset-2 hover:text-[var(--tx2)]">
        Status
      </Link>
    </p>
  );
}
