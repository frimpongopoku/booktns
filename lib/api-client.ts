// The universal half of the frontend's door to the NestJS API — importable
// from both Server and Client Components. Kept in a separate file from
// api-client.server.ts on purpose: that file imports `next/headers`
// (lib/session-cookie.ts), and Next's bundler refuses to put ANY module
// that transitively touches `next/headers` into a client bundle, even a
// function in that module a client component never actually calls.
// Bundling is per-file, not per-export, so a client component importing
// `apiBrowser` from a file that also exported `apiServer` broke the build
// outright: "You're importing a module that depends on next/headers...
// in the Pages Router".
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:2666";

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

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
}

export function buildApiInit(options: ApiRequestOptions, headers: Record<string, string>): RequestInit {
  // FormData bodies (media/verification uploads) must NOT get a JSON
  // Content-Type or a stringified body — the browser sets its own
  // multipart boundary header, which a manual "application/json" would
  // silently override, and stringifying a FormData object serializes to
  // "[object FormData]" instead of the file bytes.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: isFormData ? { ...headers } : { "Content-Type": "application/json", ...headers },
  };
  if (options.body !== undefined) init.body = isFormData ? (options.body as FormData) : JSON.stringify(options.body);
  if (options.cache) init.cache = options.cache;
  if (options.revalidate !== undefined || options.tags) {
    (init as RequestInit & { next?: unknown }).next = {
      ...(options.revalidate !== undefined ? { revalidate: options.revalidate } : {}),
      ...(options.tags ? { tags: options.tags } : {}),
    };
  }
  return init;
}

export async function parseApiResponse<T>(res: Response): Promise<T> {
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

// --- Public, unauthenticated -------------------------------------------------

// Storefront reads and guest actions (booking, checkout). Deliberately sends
// no credentials: public GETs are cacheable and shared between visitors, so
// nothing per-user may influence them; public POSTs (guest booking/order/
// self-service edit) have no session to send in the first place. Safe to
// call from either the server or the browser — this is the one function in
// the api-client split that both worlds use directly.
export async function apiPublic<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return parseApiResponse<T>(await fetch(apiUrl(path), buildApiInit(options, {})));
}

// Returns null on 404 instead of throwing, for the "shop not found" vs
// "exists but not published" branches that both render a real page.
export async function apiPublicOrNull<T>(path: string, options: ApiRequestOptions = {}): Promise<T | null> {
  try {
    return await apiPublic<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// --- Client-side, authenticated -----------------------------------------------

// Goes to this app's own /api/admin/* proxy, NOT to the API host. Same-origin,
// so the httpOnly session cookie is sent automatically; the proxy swaps it
// for a Bearer header server-side. Browser JS still never sees the token —
// see app/api/admin/[...path]/route.ts.
export async function apiBrowser<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const init = buildApiInit(options, {});
  init.credentials = "same-origin";
  return parseApiResponse<T>(await fetch(`/api/admin${path}`, init));
}
