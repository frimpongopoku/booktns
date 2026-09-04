import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../../common/config";
import type { SessionPayload, StaffRole, SuperAdminPayload } from "../../common/session.types";

export const SESSION_COOKIE = "booktns_session";
export const SUPERADMIN_COOKIE = "booktns_superadmin_session";
export const SUPERADMIN_TOKEN_KIND = "SUPERADMIN";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days, spec §4.1

interface StaffForSession {
  id: string;
  vendorId: string;
  name: string;
  role: string;
  email: string;
  vendor: { name: string };
}

@Injectable()
export class SessionService {
  private readonly secret = new TextEncoder().encode(config.jwtSecret);

  private async sign(payload: Record<string, unknown>): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
      .sign(this.secret);
  }

  // Cross-origin is the whole reason these options are configurable. See the
  // cookie notes in common/config.ts — getting this wrong doesn't error, it
  // just silently drops every session.
  private cookieOptions() {
    return {
      httpOnly: true,
      secure: config.isProduction || config.cookieSameSite === "none",
      sameSite: config.cookieSameSite,
      domain: config.cookieDomain,
      maxAge: SESSION_DURATION_SECONDS * 1000,
      path: "/",
    } as const;
  }

  async issueStaffSession(res: Response, staff: StaffForSession): Promise<void> {
    const payload: SessionPayload = {
      staffId: staff.id,
      vendorId: staff.vendorId,
      vendorName: staff.vendor.name,
      role: staff.role as StaffRole,
      staffName: staff.name,
      email: staff.email,
    };
    res.cookie(SESSION_COOKIE, await this.sign({ ...payload }), this.cookieOptions());
  }

  async issueSuperAdminSession(res: Response, admin: { id: string; email: string }): Promise<void> {
    const payload: SuperAdminPayload = { sub: admin.id, email: admin.email, kind: "SUPERADMIN" };
    res.cookie(SUPERADMIN_COOKIE, await this.sign({ ...payload }), this.cookieOptions());
  }

  clearStaffSession(res: Response): void {
    res.clearCookie(SESSION_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
  }

  clearSuperAdminSession(res: Response): void {
    res.clearCookie(SUPERADMIN_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
  }

  // The two consoles share a signing secret, so each verifier must reject the
  // other's token kind explicitly. Without this check a superadmin cookie
  // would verify as a vendor session and vice versa. Deliberately two
  // parallel implementations rather than one shared one — see CLAUDE.md
  // § Superadmin Console, rule 2.
  async verifyStaff(token: string | undefined): Promise<SessionPayload | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.secret);
      if (payload.kind === SUPERADMIN_TOKEN_KIND) return null;

      // Cookies minted before the payload carried `email` are invalid rather
      // than "a session with no identity". Every membership lookup keys on
      // this field, and Prisma drops an `undefined` filter instead of
      // matching nothing — a blank email once widened a vendor-scoped query
      // to every staff row in the database.
      if (typeof payload.email !== "string" || payload.email.length === 0) return null;

      return payload as unknown as SessionPayload;
    } catch {
      return null;
    }
  }

  async verifySuperAdmin(token: string | undefined): Promise<SuperAdminPayload | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.secret);
      if (payload.kind !== SUPERADMIN_TOKEN_KIND) return null;
      return payload as unknown as SuperAdminPayload;
    } catch {
      return null;
    }
  }
}
