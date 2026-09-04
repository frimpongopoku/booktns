import "server-only";
import { readSessionToken, readSuperAdminToken } from "@/lib/session-cookie";
import { apiUrl, buildApiInit, parseApiResponse, type ApiRequestOptions } from "@/lib/api-client";

// The server-only half of the API client — reads the httpOnly cookie
// (lib/session-cookie.ts, which imports `next/headers`) and attaches the
// token as a Bearer header. This file must never be imported from a "use
// client" component; the `server-only` import throws at build time if it
// ever ends up in a client bundle by accident, since a client bundle
// importing `next/headers` breaks Next's build outright rather than merely
// warning. See api-client.ts for why the browser-safe half lives in a
// separate file instead of here.
export {
  ApiError, apiPublic, apiPublicOrNull, apiUrl,
  type ApiErrorBody, type ApiRequestOptions,
} from "@/lib/api-client";

// For server components, server actions and route handlers acting on behalf
// of signed-in vendor staff.
export async function apiServer<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = await readSessionToken();
  return parseApiResponse<T>(
    await fetch(apiUrl(path), buildApiInit(options, token ? { Authorization: `Bearer ${token}` } : {})),
  );
}

// Same, for the superadmin console's own session cookie.
export async function apiSuperAdmin<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = await readSuperAdminToken();
  return parseApiResponse<T>(
    await fetch(apiUrl(path), buildApiInit(options, token ? { Authorization: `Bearer ${token}` } : {})),
  );
}
