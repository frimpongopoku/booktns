import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { StaffRole } from "@/types";
import { SUPERADMIN_TOKEN_KIND } from "@/lib/superadmin-auth";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "booktns_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days, per spec §4.1

export interface SessionPayload {
  staffId: string;
  vendorId: string;
  vendorName: string;
  role: StaffRole;
  staffName: string;
  // The Google identity behind the session, carried so switching vendor
  // spaces can re-look-up this person's other memberships without a second
  // round trip through Firebase. It is the *person*; staffId/vendorId/role
  // are the membership currently being occupied.
  email: string;
}

interface StaffForSession {
  id: string;
  vendorId: string;
  name: string;
  role: string;
  email: string;
  vendor: { name: string };
}

export async function createSession(staff: StaffForSession): Promise<void> {
  const payload: SessionPayload = {
    staffId: staff.id,
    vendorId: staff.vendorId,
    vendorName: staff.vendor.name,
    role: staff.role as StaffRole,
    staffName: staff.name,
    email: staff.email,
  };

  const token = await new SignJWT({ ...payload })
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Superadmin tokens are a distinct, non-tenant session space. Reject them
    // here even though the signature is valid — they carry no vendorId or
    // role, and the two must never become interchangeable. The check runs in
    // both directions; see lib/superadmin-auth.ts.
    if (payload.kind === SUPERADMIN_TOKEN_KIND) return null;

    // Sessions minted before the payload carried `email` are treated as
    // invalid rather than as a session with an empty identity: `email` is
    // what every vendor-membership lookup keys on, and a blank one is the
    // difference between "your shops" and "all shops". Signing in again
    // reissues a complete cookie; the cost of that is one Google popup.
    if (typeof payload.email !== "string" || payload.email.length === 0) return null;

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export type RequireRoleResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

// API-route guard: confirms a session exists and its role is one of `allowedRoles`,
// per the spec §7 role-permission table. Callers do:
//   const auth = await requireRole(["Owner", "Management"]);
//   if (!auth.ok) return auth.response;
export async function requireRole(allowedRoles: StaffRole[]): Promise<RequireRoleResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not signed in", code: "unauthenticated" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You don't have permission to do this", code: "forbidden" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}
