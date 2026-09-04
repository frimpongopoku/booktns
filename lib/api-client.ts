import { readSessionToken, readSuperAdminToken } from "@/lib/session-cookie";

// The frontend's door to the NestJS API.
//
// The rule this file enforces: **the raw JWT never reaches browser
// JavaScript.** It lives in an httpOnly cookie that only server-side code can
// read, and it is attached as an `Authorization: Bearer` header from the
// server. Browser components never call the API directly for anything
// authenticated — they go through the BFF proxy at /api/admin/[...path],
// which is server-side and does the attaching.
//
// Public storefront reads are the exception and go browser → API directly.
// They carry no credentials at all, which is exactly why the API's CORS can
// be permissive-origin: there is no cookie for a hostile origin to ride.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface ApiErrorBody {
  error: string;
  code: string;
}

// Carries the API's own `code` so callers can branch on "slot_unavailable"
// rather than string-matching a human-readable message.
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
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
}

function buildInit(options: RequestOptions, headers: Record<string, string>): RequestInit {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json", ...headers },
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
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiUrl(path: string): string {
  return `${API_URL}/api${path}`;
}

// --- Server-side, authenticated ---------------------------------------------

// For server components, server actions and route handlers. Reads the
// httpOnly cookie and attaches the token as a Bearer header.
export async function apiServer<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await readSessionToken();
  return parse<T>(
    await fetch(apiUrl(path), buildInit(options, token ? { Authorization: `Bearer ${token}` } : {})),
  );
}

export async function apiSuperAdmin<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await readSuperAdminToken();
  return parse<T>(
    await fetch(apiUrl(path), buildInit(options, token ? { Authorization: `Bearer ${token}` } : {})),
  );
}

// --- Public, unauthenticated -------------------------------------------------

// Storefront reads. Deliberately sends no credentials: these responses are
// cacheable and shared between visitors, so nothing per-user may influence
// them. Safe to call from either the server or the browser.
export async function apiPublic<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return parse<T>(await fetch(apiUrl(path), buildInit(options, {})));
}

// Returns null on 404 instead of throwing, for the "shop not found" vs
// "exists but not published" branches that both render a real page.
export async function apiPublicOrNull<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
  try {
    return await apiPublic<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Browser, authenticated --------------------------------------------------

// Goes to this app's own /api/admin/* proxy, NOT to the API host. Same-origin,
// so the httpOnly cookie is sent automatically; the proxy swaps it for a
// Bearer header server-side. Browser JS still never sees the token.
export async function apiBrowser<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init = buildInit(options, {});
  init.credentials = "same-origin";
  return parse<T>(await fetch(`/api/admin${path}`, init));
}
