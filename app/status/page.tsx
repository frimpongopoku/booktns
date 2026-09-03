import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import Logo from "@/components/shared/Logo";
import PlatformCredit from "@/components/shared/PlatformCredit";
import { buildHealthReport, type CheckStatus, type HealthCheckResult } from "@/lib/health";

// Never cached — a status page that can serve a stale verdict is worse than
// no status page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Status",
  description: "Live status of the Booktns platform and the services it depends on.",
  alternates: { canonical: "/status" },
  // Deliberately not indexed: it's a live operational view, not content, and
  // a stale snapshot of it in search results would be actively misleading.
  robots: { index: false, follow: true },
};

const STATUS_META: Record<CheckStatus, { label: string; color: string; bg: string }> = {
  ok: { label: "Operational", color: "var(--green)", bg: "var(--green-bg)" },
  warn: { label: "Degraded", color: "var(--amber)", bg: "var(--amber-bg)" },
  error: { label: "Down", color: "#B91C1C", bg: "rgba(185,28,28,0.10)" },
};

const OVERALL_HEADLINE: Record<CheckStatus, string> = {
  ok: "All systems operational",
  warn: "Operational, with warnings",
  error: "Some systems are down",
};

function StatusIcon({ status }: { status: CheckStatus }) {
  const color = STATUS_META[status].color;
  if (status === "ok") return <CheckCircle2 size={16} style={{ color }} />;
  if (status === "warn") return <AlertTriangle size={16} style={{ color }} />;
  return <XCircle size={16} style={{ color }} />;
}

function CheckRow({ check }: { check: HealthCheckResult }) {
  return (
    <div
      className="flex items-start gap-3 py-3.5"
      style={{ borderBottom: "1px solid var(--bds)" }}
    >
      <span className="mt-0.5 flex-shrink-0">
        <StatusIcon status={check.status} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>
          {check.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--tx3)" }}>
          {check.detail}
        </p>
      </div>
      <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: "var(--tx3)" }}>
        {check.ms}ms
      </span>
    </div>
  );
}

export default async function StatusPage() {
  const report = await buildHealthReport();
  const overall = STATUS_META[report.status];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header
        className="px-4 md:px-8 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--bd)" }}
      >
        <Logo size="sm" href="/" />
        <Link href="/" className="text-sm" style={{ color: "var(--tx2)" }}>
          Back to Booktns
        </Link>
      </header>

      <main className="flex-1 px-4 md:px-8 py-10 md:py-14">
        <div className="max-w-2xl mx-auto">
          <h1
            className="font-display text-3xl md:text-4xl font-medium"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            System status
          </h1>

          <div
            className="mt-6 flex items-center gap-2.5 px-4 py-3 rounded-[var(--rl)]"
            style={{ background: overall.bg, border: `1px solid ${overall.color}` }}
          >
            <StatusIcon status={report.status} />
            <p className="text-sm font-semibold" style={{ color: overall.color }}>
              {OVERALL_HEADLINE[report.status]}
            </p>
          </div>

          {/* The web app gets its own row: if this page rendered at all, the
              frontend is up. Everything below it is a real round trip. */}
          <section className="mt-10">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--tx3)" }}>
              Web app
            </p>
            <CheckRow
              check={{
                name: "Booktns web app",
                status: "ok",
                detail: `Serving requests · v${process.env.NEXT_PUBLIC_APP_VERSION} build ${process.env.NEXT_PUBLIC_BUILD_NUMBER}`,
                ms: 0,
              }}
            />
          </section>

          <section className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--tx3)" }}>
              Services
            </p>
            {report.checks.map((check) => (
              <CheckRow key={check.name} check={check} />
            ))}
          </section>

          <p className="text-xs mt-6" style={{ color: "var(--tx3)" }}>
            Checked {new Date(report.checkedAt).toUTCString()} · {report.totalMs}ms total ·{" "}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                /api/health is a JSON endpoint, not a page; next/link would
                prefetch it and run every health check on hover. */}
            <a href="/api/health" className="underline">JSON</a>
          </p>

          <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--bd)" }}>
            <PlatformCredit />
          </div>
        </div>
      </main>
    </div>
  );
}
