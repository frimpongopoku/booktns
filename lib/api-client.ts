import { cookies } from "next/headers";

// The single door from the frontend to the NestJS API. Everything that used
// to be `db.something.findMany()` inside a server component, or a `fetch`
// to a local /api route, goes through here instead.
//
// Two things this has to get right, both of which fail silently otherwise:
//
//  1. Cookies do not forward themselves. A server component runs on Vercel's
//     server, not in the browser, so an outgoing fetch carries no cookies
//     unless we copy them across from the incoming request. Without this the
//     API sees an anonymous caller and returns 401 for every dashboard read.
//
//  2. Browser calls need `credentials: "include"`. Same-origin fetches send
//     cookies by default; cross-origin ones do not.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiErrorBody {
  error: string;
  code: string;
}

// Thrown for any non-2xx. Carries the status and the API's own `code` so
// callers can branch on "slot_unavailable" rather than string-matching the
// human-readable message.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  // Next's fetch cache directives. Public storefront reads can be cached and
  // revalidated; anything session-scoped must not be.
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
}

function buildInit(options: RequestOptions, headers: Record<string, string>): RequestInit {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json", ...headers },
    credentials: "include",
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.cache) init.cache = options.cache;
  if (options.revalidate !== undefined || options.tags) {
    (init as RequestInit & { next?: unknown }).next = {
      ...(options.revalidate !== undefined ? { revalidate: options.revalidate } : {}),
      ...(options.tags ? { tags: options.tags } : {}),
    };
  }
  return init;
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.error ?? "Something went wrong. Please try again.",
      res.status,
      body?.code ?? "unknown_error",
    );
  }
  return (await res.json()) as T;
}

// --- Server-side ------------------------------------------------------------

// Use from server components, route handlers and server actions. Forwards the
// caller's cookies so the API sees the same session the browser has.
export async function apiServer<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(
    `${API_URL}/api${path}`,
    buildInit(options, cookieHeader ? { Cookie: cookieHeader } : {}),
  );
  return parse<T>(res);
}

// Public reads with no session — storefront pages, sitemap, OG images.
// Deliberately does NOT forward cookies: these responses are cacheable and
// shared between visitors, so a per-user cookie must never influence them.
export async function apiPublic<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, buildInit(options, {}));
  return parse<T>(res);
}

// Same as apiPublic but returns null on a 404 instead of throwing, for the
// "shop not found vs. not published yet" branches that render a real page.
export async function apiPublicOrNull<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  try {
    return await apiPublic<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Client-side ------------------------------------------------------------

// Use from "use client" components. The browser attaches the session cookie
// itself, but only because of credentials: "include" — and only if the API's
// CORS_ORIGINS lists this origin and the cookie's SameSite allows it.
export async function apiBrowser<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, buildInit(options, {}));
  return parse<T>(res);
}

export { API_URL };
