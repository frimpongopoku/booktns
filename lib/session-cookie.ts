import { cookies } from "next/headers";

export const SESSION_COOKIE = "booktns_session";
export const SUPERADMIN_COOKIE = "booktns_superadmin_session";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days, spec §4.1

// The Next.js app is the ONLY thing in the system that touches a cookie. The
// NestJS API is cookie-blind: it returns a JWT in a response body and reads
// it back from an Authorization header.
//
// The critical detail is what is NOT set here: there is no `domain`
// attribute. That makes this a host-only, first-party cookie, minted against
// whatever host the browser is currently on. A vendor signing in on their own
// custom domain gets a cookie for that domain; the same code on the platform
// domain gets one for that. No wildcard domain to configure, no third-party
// cookie, nothing for Safari's ITP to block.
//
// Setting `domain` here — even to a seemingly harmless `.booktns.com` —
// would break every vendor's custom domain at once, because their host is not
// under that apex.
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DURATION_SECONDS));
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSuperAdminCookie(token: string): Promise<void> {
  (await cookies()).set(SUPERADMIN_COOKIE, token, cookieOptions(SESSION_DURATION_SECONDS));
}

export async function clearSuperAdminCookie(): Promise<void> {
  (await cookies()).delete(SUPERADMIN_COOKIE);
}

export async function readSuperAdminToken(): Promise<string | undefined> {
  return (await cookies()).get(SUPERADMIN_COOKIE)?.value;
}
