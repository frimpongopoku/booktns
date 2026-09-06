import { jwtVerify } from "jose";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSuperAdminToken } from "@/lib/session-cookie";
import { apiSuperAdmin, ApiError } from "@/lib/api-client.server";

// Falls back to JWT_SECRET so a single-secret dev setup keeps working, but
// mirrors the backend's own config.superAdminJwtSecret fallback exactly —
// set SUPERADMIN_JWT_SECRET in production, matching Railway's value
// byte-for-byte. Verification only: the token itself is minted by the
// NestJS API (see app/api/superadmin/auth/session/route.ts), never here.
const JWT_SECRET = new TextEncoder().encode(process.env.SUPERADMIN_JWT_SECRET?.trim() || process.env.JWT_SECRET);

// The discriminator that keeps the two session spaces apart. Both this
// module and lib/auth.ts check it, in both directions.
export const SUPERADMIN_TOKEN_KIND = "SUPERADMIN";

export interface SuperAdminSessionPayload {
  sub: string;
  email: string;
  kind: typeof SUPERADMIN_TOKEN_KIND;
}

// Wrapped in React's cache() so the console layout and any page in the same
// render share one verification. Local JWT verification only, no network
// call and no database — reading a cookie this app already holds is not the
// direct-database-access this migration is eliminating.
export const getSuperAdminSession = cache(async (): Promise<SuperAdminSessionPayload | null> => {
  const token = await readSuperAdminToken();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // A validly-signed *vendor* token must not be accepted here.
    if (payload.kind !== SUPERADMIN_TOKEN_KIND) return null;
    return payload as unknown as SuperAdminSessionPayload;
  } catch {
    return null;
  }
});

// Next's App Router can start rendering a page concurrently with its parent
// layout — so even though app/superadmin/(console)/layout.tsx redirects to
// /superadmin/login when there's no session, a page below it can still run
// far enough to fire its own API call first and hit a bare 401. Every
// superadmin page's data fetch goes through this instead of calling
// apiSuperAdmin directly, so that race ends the same way the layout's own
// check would: a redirect, not an unhandled ApiError in the server log.
export async function apiSuperAdminOrRedirect<T>(path: string): Promise<T> {
  try {
    return await apiSuperAdmin<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/superadmin/login");
    throw err;
  }
}
