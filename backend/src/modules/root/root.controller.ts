import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { config } from "../../common/config";
import { API_VERSION } from "../../common/version";

// A human landing page at the API root.
//
// Someone will end up here: a curious shopper who noticed the hostname, a
// developer checking the service is alive, or the owner pasting the URL into
// a browser out of habit. A raw 404 from Nest tells all three nothing. This
// says what the service is, that it's running, and where to actually go.
//
// Deliberately not API documentation — there is no public API programme, and
// listing endpoints on an unauthenticated page invites probing.
@Public()
@Controller()
export class RootController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  // Cached briefly: it's static apart from the version, and this is the URL
  // most likely to be hit by something automated.
  @Header("Cache-Control", "public, max-age=300")
  index(): string {
    return landingPage();
  }
}

// Inlined rather than served from a template file or a static directory: it
// keeps the Docker image copy list to dist/ alone, and this is the only HTML
// the API will ever return.
function landingPage(): string {
  const year = new Date().getFullYear();
  const appUrl = config.appUrl;

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Booktns API</title>
<meta name="description" content="The Booktns API — the backend behind every storefront, the vendor dashboard, and the platform console." />
<!-- Not a page anyone should find in search results. -->
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%2309090B'/><text x='16' y='23' font-family='system-ui,sans-serif' font-size='19' font-weight='700' fill='%23D43D50' text-anchor='middle'>b</text></svg>" />
<style>
  :root {
    --bg: #FAFAFA; --bg2: #F4F4F5; --bd: rgba(0,0,0,0.12);
    --tx: #18181B; --tx2: #3F3F46; --tx3: #52525B;
    --ac: #C0283A; --ac-bg: rgba(192,40,58,0.10);
    --green: #15803D; --green-bg: rgba(21,128,61,0.12);
  }
  /* Same token ramps as the app (app/globals.css) — the tertiary step is
     deliberately dark enough to actually read, which the original values
     were not. */
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #09090B; --bg2: #18181B; --bd: rgba(255,255,255,0.14);
      --tx: #FAFAFA; --tx2: #D4D4D8; --tx3: #A1A1AA;
      --ac: #D43D50; --ac-bg: rgba(212,61,80,0.14);
      --green: #4ADE80; --green-bg: rgba(74,222,128,0.12);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; flex-direction: column;
    background: var(--bg); color: var(--tx);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif;
    line-height: 1.6; -webkit-font-smoothing: antialiased;
  }
  main {
    flex: 1; width: 100%; max-width: 34rem;
    margin: 0 auto; padding: 4rem 1.5rem 3rem;
    display: flex; flex-direction: column; justify-content: center;
  }
  .pill {
    display: inline-flex; align-items: center; gap: .45rem;
    padding: .3rem .7rem; border-radius: 999px;
    background: var(--green-bg); color: var(--green);
    font-size: .75rem; font-weight: 600; width: fit-content;
    margin-bottom: 1.5rem;
  }
  .dot {
    width: .4rem; height: .4rem; border-radius: 999px;
    background: currentColor; flex-shrink: 0;
  }
  h1 {
    margin: 0 0 .4rem; font-size: 1.9rem; font-weight: 600;
    letter-spacing: -0.03em; display: flex; align-items: baseline;
    gap: .6rem; flex-wrap: wrap;
  }
  h1 .mark { color: var(--ac); }
  .version {
    font-size: .8rem; font-weight: 500; color: var(--tx3);
    font-variant-numeric: tabular-nums;
  }
  .lead { margin: 0 0 1rem; font-size: 1rem; color: var(--tx2); }
  p.body { margin: 0 0 2rem; font-size: .93rem; color: var(--tx2); }
  .links { display: flex; flex-wrap: wrap; gap: .6rem; }
  a.btn {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .6rem 1.1rem; border-radius: .55rem;
    font-size: .88rem; font-weight: 500; text-decoration: none;
    transition: opacity .15s ease;
  }
  a.btn:hover { opacity: .85; }
  a.primary { background: var(--ac); color: #fff; }
  a.secondary { background: var(--bg2); color: var(--tx); border: 1px solid var(--bd); }
  footer {
    border-top: 1px solid var(--bd); padding: 1.25rem 1.5rem;
    font-size: .78rem; color: var(--tx3); text-align: center;
  }
  footer a { color: var(--tx2); text-decoration: underline; text-underline-offset: 2px; }
</style>
</head>
<body>
  <main>
    <span class="pill"><span class="dot"></span>Running</span>

    <h1><span><span class="mark">book</span>tns API</span><span class="version">v${API_VERSION}</span></h1>
    <p class="lead">This is the Booktns API.</p>

    <p class="body">
      The backend powering every storefront, the vendor dashboard, and the platform
      console. Nothing to see here if you&rsquo;re booking an appointment &mdash; you
      probably want the shop itself.
    </p>

    <div class="links">
      <a class="btn primary" href="${appUrl}">Go to Booktns</a>
      <a class="btn secondary" href="/api/health">System status</a>
    </div>
  </main>

  <footer>
    &copy; ${year} Booktns API v${API_VERSION} &mdash; built by the
    <a href="mailto:message@biibisoft.com?subject=Work%20with%20Biibisoft">Biibisoft Team</a>
  </footer>
</body>
</html>`;
}
