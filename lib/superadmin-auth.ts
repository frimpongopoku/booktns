import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// A different cookie from the vendor session's `booktns_session`, so someone
// signed into both consoles in one browser never has one clobber the other.
const COOKIE_NAME = "booktns_superadmin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

// The discriminator that keeps the two session spaces apart. Both this module
// and lib/auth.ts check it, in both directions — the tokens share a signing
// secret, so a superadmin token pasted into the vendor cookie would otherwise
// verify cleanly.
export const SUPERADMIN_TOKEN_KIND = "SUPERADMIN";

export interface SuperAdminSessionPayload {
  sub: string;
  email: string;
  name?: string;
  kind: typeof SUPERADMIN_TOKEN_KIND;
}

export async function createSuperAdminSession(admin: { id: string; email: string; name: string | null }): Promise<void> {
  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    name: admin.name ?? undefined,
    kind: SUPERADMIN_TOKEN_KIND,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

// Wrapped in React's cache() so the console layout and any page in the same
// render share one verification.
export const getSuperAdminSession = cache(async (): Promise<SuperAdminSessionPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
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

export async function clearSuperAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export type RequireSuperAdminResult =
  | { ok: true; admin: SuperAdminSessionPayload }
  | { ok: false; response: NextResponse };

// API-route guard for every /api/superadmin/* route. Deliberately parallel to
// lib/auth.ts's requireRole rather than sharing an implementation with it:
// slight duplication, zero chance of one silently accepting the other's token.
export async function requireSuperAdmin(): Promise<RequireSuperAdminResult> {
  const admin = await getSuperAdminSession();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in", code: "unauthenticated" }, { status: 401 }),
    };
  }
  return { ok: true, admin };
}
