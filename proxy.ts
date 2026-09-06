import { NextRequest, NextResponse } from "next/server";
import { getVendorSlugByCustomDomain } from "@/lib/vendors";
import { CUSTOM_DOMAIN_HEADER } from "@/lib/request-context";

// No `runtime` config here — Proxy (Next 16's renamed Middleware) defaults
// to the Node.js runtime already; setting `runtime` explicitly is not just
// unnecessary but throws an error on a Proxy file.
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

// getVendorSlugByCustomDomain now makes a real HTTP call to the NestJS API
// (see lib/vendors.ts) instead of a local Prisma query, and this runs on
// every request to every custom domain — the cheapest request on the
// platform doesn't deserve a network round trip every single time. A short
// TTL cache in front of it keeps a slow-or-unreachable backend from making
// every custom-domain pageview slower; 60s is short enough that a vendor
// re-verifying their domain or a slug change shows up almost immediately.
const DOMAIN_CACHE_TTL_MS = 60_000;
const domainSlugCache = new Map<string, { slug: string | null; expiresAt: number }>();

async function resolveVendorSlugCached(hostname: string): Promise<string | null> {
  const cached = domainSlugCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return cached.slug;

  const slug = await getVendorSlugByCustomDomain(hostname);
  domainSlugCache.set(hostname, { slug, expiresAt: Date.now() + DOMAIN_CACHE_TTL_MS });
  return slug;
}

const platformHostname = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2665").hostname;
const KNOWN_PLATFORM_HOSTS = new Set([platformHostname, "localhost", "127.0.0.1"]);

// Routes that are already global/unprefixed on every host — never
// slug-prefix these, even on a verified custom domain.
// "/ingest" is the PostHog reverse-proxy path (see next.config.ts rewrites)
// — slug-prefixing it on a custom domain would silently break analytics for
// exactly the vendors who have gone furthest in setting up their storefront.
const EXCLUDED_PREFIXES = ["/api", "/ingest", "/dashboard", "/login", "/onboarding", "/booking", "/order"];
const EXCLUDED_EXACT = ["/robots.txt", "/sitemap.xml", "/favicon.ico"];

function isExcludedPath(pathname: string): boolean {
  if (EXCLUDED_EXACT.includes(pathname)) return true;
  return EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Named export — Next's proxy file convention requires a function named
// `proxy`, not a default export.
export function proxy(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!hostname || KNOWN_PLATFORM_HOSTS.has(hostname)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isExcludedPath(pathname)) return NextResponse.next();

  try {
    const slug = await resolveVendorSlugCached(hostname);
    if (!slug) return NextResponse.next();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(CUSTOM_DOMAIN_HEADER, "1");

    // Idempotency guard: if a path already starts with the slug (any code
    // path that already baked it in), don't double-prefix — avoids a
    // double-prefix 404 like /{slug}/{slug}/shop.
    const alreadyPrefixed = pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);
    if (alreadyPrefixed) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${slug}` : `/${slug}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } catch {
    // Never let a broken custom domain or an unreachable API break the
    // platform-domain path or throw a 500 — fall through unrewritten.
    return NextResponse.next();
  }
}
