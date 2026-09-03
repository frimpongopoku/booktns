import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/shared/Logo";
import { LEGAL_EFFECTIVE_DATE, type LegalSection } from "@/lib/legal";

interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
  // The other legal document, cross-linked from the footer — someone reading
  // one almost always wants to know the other exists.
  otherDocHref: string;
  otherDocLabel: string;
  children: ReactNode;
}

// Shared shell for the Privacy Policy and Terms of Service: same header,
// same contents list, same measure, same footer. Two legal documents that
// look like two different websites read as less trustworthy than one.
export default function LegalPage({ title, intro, sections, otherDocHref, otherDocLabel, children }: LegalPageProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-30"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--bd)" }}
      >
        <Logo size="sm" href="/" />
        <Link href="/" className="text-sm" style={{ color: "var(--tx2)" }}>
          Back to Booktns
        </Link>
      </header>

      <main className="px-4 md:px-8 py-10 md:py-14">
        <div className="max-w-2xl mx-auto">
          <h1
            className="font-display text-3xl md:text-4xl font-medium"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            {title}
          </h1>
          <p className="text-sm mt-3" style={{ color: "var(--tx3)" }}>
            Effective {LEGAL_EFFECTIVE_DATE}
          </p>
          <p className="text-base mt-6 leading-relaxed" style={{ color: "var(--tx2)" }}>
            {intro}
          </p>

          <nav
            className="mt-8 p-4 rounded-[var(--rl)]"
            style={{ background: "var(--bg2)", border: "1px solid var(--bds)" }}
            aria-label="Contents"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--tx3)" }}>
              Contents
            </p>
            <ol className="flex flex-col gap-1.5">
              {sections.map((section, index) => (
                <li key={section.id} className="text-sm">
                  <a href={`#${section.id}`} className="hover:underline" style={{ color: "var(--tx2)" }}>
                    <span style={{ color: "var(--tx3)" }}>{index + 1}.</span> {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-10 flex flex-col gap-10">{children}</div>

          <div className="mt-14 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderTop: "1px solid var(--bd)" }}>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>
              © {new Date().getFullYear()} Booktns
            </p>
            <Link href={otherDocHref} className="text-sm hover:underline" style={{ color: "var(--ac)" }}>
              {otherDocLabel}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

interface LegalSectionBlockProps {
  id: string;
  index: number;
  title: string;
  children: ReactNode;
}

// One numbered section. `scroll-mt` keeps the heading clear of the sticky
// header when the contents list jumps to it.
export function LegalSectionBlock({ id, index, title, children }: LegalSectionBlockProps) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--tx)" }}>
        <span style={{ color: "var(--tx3)" }}>{index}.</span> {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed" style={{ color: "var(--tx2)" }}>
        {children}
      </div>
    </section>
  );
}

// Bulleted list with the spacing and colour the surrounding prose uses.
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-5 list-disc" style={{ color: "var(--tx2)" }}>
      {items.map((item, index) => (
        <li key={index} className="text-sm leading-relaxed">
          {item}
        </li>
      ))}
    </ul>
  );
}
