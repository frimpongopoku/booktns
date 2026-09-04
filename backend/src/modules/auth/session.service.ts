import { Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../../common/config";
import type { SessionPayload, StaffRole, SuperAdminPayload } from "../../common/session.types";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days, spec §4.1

interface StaffForSession {
  id: string;
  vendorId: string;
  name: string;
  role: string;
  email: string;
  vendor: { name: string };
}

// This API is deliberately COOKIE-BLIND. It never reads or sets a cookie:
// auth endpoints return a signed JWT in the response body, and every guarded
// request presents it as `Authorization: Bearer <token>`.
//
// That single decision is what makes multi-tenant custom domains work at all.
// The alternative — the API setting a session cookie directly — needs
// SameSite=None once the frontend is on a different origin, which makes the
// session a third-party cookie that Safari's ITP blocks and Chrome is
// phasing out. It also forces CORS into `credentials: true` with a fixed
// origin allowlist, which silently breaks every vendor's own custom domain.
//
// Instead the Next.js app owns the cookie: it mints a host-only, httpOnly,
// first-party cookie against whatever host the browser is actually on, and a
// server-side BFF proxy re-attaches the token as a Bearer header. Browser
// JavaScript never holds the token.
@Injectable()
export class SessionService {
  private readonly staffSecret = new TextEncoder().encode(config.jwtSecret);

  // A DIFFERENT secret for the platform console. The vendor and superadmin
  // token spaces are fully parallel — separate table, separate payload
  // shape, separate frontend cookie. Signing them with different secrets
  // means a token from one space fails signature verification in the other
  // outright, rather than relying on both guards remembering to check a
  // `kind` discriminator. A future route that forgets the check is then
  // still safe.
  private readonly superAdminSecret = new TextEncoder().encode(config.superAdminJwtSecret);

  private async sign(payload: Record<string, unknown>, secret: Uint8Array): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
      .sign(secret);
  }

  async issueStaffToken(staff: StaffForSession): Promise<string> {
    const payload: SessionPayload = {
      staffId: staff.id,
      vendorId: staff.vendorId,
      vendorName: staff.vendor.name,
      role: staff.role as StaffRole,
      staffName: staff.name,
      email: staff.email,
    };
    return this.sign({ ...payload }, this.staffSecret);
  }

  async issueSuperAdminToken(admin: { id: string; email: string }): Promise<string> {
    const payload: SuperAdminPayload = { sub: admin.id, email: admin.email, kind: "SUPERADMIN" };
    return this.sign({ ...payload }, this.superAdminSecret);
  }

  async verifyStaff(token: string | undefined): Promise<SessionPayload | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, this.staffSecret);

      // Belt and braces alongside the separate secret above: a superadmin
      // token can no longer verify here anyway, but the discriminator check
      // costs nothing and documents the intent.
      if (payload.kind === "SUPERADMIN") return null;

      // Tokens minted before the payload carried `email` are invalid rather
      // than "a session with no identity". Every membership lookup keys on
      // this field, and Prisma DROPS an `undefined` filter instead of
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
      const { payload } = await jwtVerify(token, this.superAdminSecret);
      if (payload.kind !== "SUPERADMIN") return null;
      return payload as unknown as SuperAdminPayload;
    } catch {
      return null;
    }
  }
}

// Pulls the token out of `Authorization: Bearer <token>`. Exported so the
// guard and any future interceptor read it the same way.
export function bearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  return token;
}
