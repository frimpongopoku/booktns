import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StaffRole } from "@/types";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "booktns_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days, per spec §4.1

export interface SessionPayload {
  staffId: string;
  vendorId: string;
  vendorName: string;
  role: StaffRole;
  staffName: string;
}

interface StaffForSession {
  id: string;
  vendorId: string;
  name: string;
  role: string;
  vendor: { name: string };
}

export async function createSession(staff: StaffForSession): Promise<void> {
  const payload: SessionPayload = {
    staffId: staff.id,
    vendorId: staff.vendorId,
    vendorName: staff.vendor.name,
    role: staff.role as StaffRole,
    staffName: staff.name,
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
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
