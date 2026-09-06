import type { CheckStatus, HealthReport } from "../../common/lib/health";
import { API_VERSION } from "../../common/version";

const HEADLINE: Record<CheckStatus, string> = {
  ok: "All systems operational",
  warn: "Running with reduced capability",
  error: "Some systems are not responding",
};

const DOT: Record<CheckStatus, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  error: "var(--bad)",
};

// Escapes anything interpolated into the page. Check names are our own
// constants today, but this page is one edit away from someone rendering a
// provider's error string into it, and an unauthenticated page is the wrong
// place to discover that mistake.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCheckedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
}

// A human status page, served to a browser at /api/health. Machines asking
// for JSON get JSON — see the controller's content negotiation.
//
// Everything rendered here has already been through redactForPublic(), so
// there are no bucket names, provider error strings or configuration hints on
// this page. Status, name and timing only.
export function renderHealthPage(report: HealthReport): string {
  const rows = report.checks
    .map(
      (c) => `
      <li class="row">
        <span class="dot" style="background:${DOT[c.status]}" aria-hidden="true"></span>
        <span class="name">${escapeHtml(c.name)}</span>
        <span class="state" data-status="${c.status}">${escapeHtml(c.detail)}</span>
        <span class="ms">${c.ms}ms</span>
      </li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Booktns status</title>
<meta name="description" content="Live status of the Booktns API and the services it depends on." />
<meta name="robots" content="noindex, nofollow" />
<!-- Same mark as the frontend's favicon and the API root page
     (root.controller.ts) — a bold "B" on the brand red gradient. Each of
     the three HTML pages this API serves carries its own inline copy since
     they're independent responses, not a shared template. -->
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='g' x1='0' y1='0' x2='32' y2='32' gradientUnits='userSpaceOnUse'><stop offset='0%25' stop-color='%23C0283A'/><stop offset='100%25' stop-color='%238C1827'/></linearGradient></defs><rect width='32' height='32' rx='7' fill='url(%23g)'/><text x='16' y='22.5' font-family='system-ui,sans-serif' font-size='19' font-weight='700' fill='white' text-anchor='middle'>B</text></svg>" />
<style>
  :root {
    --bg:#FAFAFA; --bg2:#F4F4F5; --bd:rgba(0,0,0,0.12);
    --tx:#18181B; --tx2:#3F3F46; --tx3:#52525B;
    --ac:#C0283A;
    --ok:#15803D; --ok-bg:rgba(21,128,61,0.10);
    --warn:#B45309; --warn-bg:rgba(180,83,9,0.10);
    --bad:#B91C1C; --bad-bg:rgba(185,28,28,0.10);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#09090B; --bg2:#18181B; --bd:rgba(255,255,255,0.14);
      --tx:#FAFAFA; --tx2:#D4D4D8; --tx3:#A1A1AA;
      --ac:#D43D50;
      --ok:#4ADE80; --ok-bg:rgba(74,222,128,0.12);
      --warn:#FBBF24; --warn-bg:rgba(251,191,36,0.12);
      --bad:#F87171; --bad-bg:rgba(248,113,113,0.12);
    }
  }
  *{box-sizing:border-box}
  body{
    margin:0;min-height:100vh;display:flex;flex-direction:column;
    background:var(--bg);color:var(--tx);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    line-height:1.6;-webkit-font-smoothing:antialiased;
  }
  main{flex:1;width:100%;max-width:40rem;margin:0 auto;padding:3.5rem 1.5rem 2rem}
  .banner{
    display:flex;align-items:center;gap:.75rem;
    padding:1rem 1.15rem;border-radius:.6rem;margin-bottom:2rem;
    background:var(--${report.status === "ok" ? "ok" : report.status === "warn" ? "warn" : "bad"}-bg);
  }
  .banner .glyph{
    width:1.6rem;height:1.6rem;border-radius:50%;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    background:var(--${report.status === "ok" ? "ok" : report.status === "warn" ? "warn" : "bad"});
    color:var(--bg);font-size:.9rem;font-weight:700;
  }
  .banner .headline{
    font-size:1.05rem;font-weight:600;
    color:var(--${report.status === "ok" ? "ok" : report.status === "warn" ? "warn" : "bad"});
  }
  h1{font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;margin:0 0 .2rem}
  h1 .mark{color:var(--ac)}
  .sub{margin:0 0 2rem;font-size:.9rem;color:var(--tx3)}
  h2{
    font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;
    color:var(--tx3);margin:0 0 .6rem;
  }
  ul{list-style:none;margin:0;padding:0;border:1px solid var(--bd);border-radius:.6rem;overflow:hidden}
  .row{
    display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;
    align-items:center;gap:.75rem;padding:.7rem 1rem;
    background:var(--bg2);
  }
  .row + .row{border-top:1px solid var(--bd)}
  .dot{width:.5rem;height:.5rem;border-radius:50%;flex-shrink:0}
  .name{font-size:.9rem;color:var(--tx);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .state{font-size:.78rem;font-weight:500;white-space:nowrap}
  .state[data-status="ok"]{color:var(--ok)}
  .state[data-status="warn"]{color:var(--warn)}
  .state[data-status="error"]{color:var(--bad)}
  .ms{
    font-size:.78rem;color:var(--tx3);
    font-variant-numeric:tabular-nums;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    min-width:3.5rem;text-align:right;
  }
  .meta{
    margin-top:1.25rem;font-size:.8rem;color:var(--tx3);
    display:flex;flex-wrap:wrap;gap:.4rem .9rem;align-items:baseline;
  }
  .meta a{color:var(--ac);text-underline-offset:2px}
  footer{
    border-top:1px solid var(--bd);padding:1.25rem 1.5rem;
    font-size:.78rem;color:var(--tx3);text-align:center;
  }
  footer a{color:var(--tx2);text-decoration:underline;text-underline-offset:2px}
  a:focus-visible{outline:2px solid var(--ac);outline-offset:3px;border-radius:3px}
  @media (max-width:30rem){
    .row{grid-template-columns:auto minmax(0,1fr) auto;row-gap:.15rem}
    .ms{grid-column:3}
    .state{grid-column:2;font-size:.75rem}
  }
</style>
</head>
<body>
  <main>
    <h1><span class="mark">book</span>tns status</h1>
    <p class="sub">Live status of the API and the services it depends on.</p>

    <div class="banner">
      <span class="glyph" aria-hidden="true">${report.status === "ok" ? "&#10003;" : "!"}</span>
      <span class="headline">${HEADLINE[report.status]}</span>
    </div>

    <h2>Services</h2>
    <ul>${rows}</ul>

    <p class="meta">
      <span>Last checked ${escapeHtml(formatCheckedAt(report.checkedAt))}</span>
      <span>&middot;</span>
      <span>${report.totalMs}ms</span>
      <span>&middot;</span>
      <a href="/api/health">Refresh</a>
      <span>&middot;</span>
      <a href="/api/health?format=json">JSON</a>
    </p>
  </main>

  <footer>
    &copy; ${new Date().getFullYear()} Booktns API v${escapeHtml(API_VERSION)} &mdash; built by the
    <a href="mailto:message@biibisoft.com?subject=Work%20with%20Biibisoft">Biibisoft Team</a>
  </footer>
</body>
</html>`;
}
