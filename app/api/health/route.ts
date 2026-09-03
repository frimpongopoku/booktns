import { NextResponse } from "next/server";
import { buildHealthReport, type HealthReport, type CheckStatus } from "@/lib/health";

// Always run the checks; never serve a cached verdict about whether the
// system is up.
export const dynamic = "force-dynamic";

// Public and unauthenticated by design — a status page you need a session to
// read is useless exactly when you need it most.
//
// The rule that makes that safe: reveal pass/fail plus a short diagnostic
// sentence, never a credential, never a full stack trace, never an internal
// hostname. That is why every `detail` in lib/health.ts is a hand-written
// sentence with at most `err.message` appended, never the error object.
export async function GET(request: Request) {
  const report = await buildHealthReport();

  // `warn` is informational — a dev fallback in use, not an outage — so only
  // a hard error is a 503.
  const httpStatus = report.status === "error" ? 503 : 200;

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json") || !accept.includes("text/html")) {
    return NextResponse.json(report, { status: httpStatus });
  }

  return new NextResponse(renderHealthHtml(report), {
    status: httpStatus,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const STATUS_COLORS: Record<CheckStatus, string> = {
  ok: "#15803D",
  warn: "#B45309",
  error: "#B91C1C",
};

const STATUS_HEADLINES: Record<CheckStatus, string> = {
  ok: "All systems operational",
  warn: "Operational with warnings",
  error: "Some systems are down",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A hand-built template string rather than a React page: this endpoint has to
// keep working when the app's rendering is what's broken, so it depends on
// nothing but the report it was handed. The styling mirrors the product's own
// so it doesn't read as a bare stub of a different system.
function renderHealthHtml(report: HealthReport): string {
  const rows = report.checks
    .map(
      (check) => `
      <tr>
        <td><span class="dot" style="background:${STATUS_COLORS[check.status]}"></span></td>
        <td class="name">${escapeHtml(check.name)}</td>
        <td class="detail">${escapeHtml(check.detail)}</td>
        <td class="ms">${check.ms}ms</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Booktns status</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 0; padding: 48px 24px;
         background: #FAFAFA; color: #18181B; }
  @media (prefers-color-scheme: dark) { body { background: #09090B; color: #FAFAFA; } td { border-color: #27272A !important; } .detail, .ms { color: #A1A1AA !important; } }
  main { max-width: 760px; margin: 0 auto; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .headline { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600;
              color: ${STATUS_COLORS[report.status]}; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 12px 8px; border-bottom: 1px solid #E4E4E7; font-size: 14px; vertical-align: top; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 999px; }
  .name { font-weight: 500; white-space: nowrap; }
  .detail { color: #71717A; }
  .ms { color: #A1A1AA; text-align: right; white-space: nowrap; }
  footer { margin-top: 28px; font-size: 12px; color: #A1A1AA; }
</style></head>
<body><main>
  <h1>Booktns status</h1>
  <p class="headline"><span class="dot" style="background:${STATUS_COLORS[report.status]}"></span>${STATUS_HEADLINES[report.status]}</p>
  <table>${rows}</table>
  <footer>Checked ${escapeHtml(report.checkedAt)} · ${report.totalMs}ms total</footer>
</main></body></html>`;
}
