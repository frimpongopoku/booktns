import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PUBLIC_KEY, ROLES_KEY, SUPERADMIN_KEY } from "../decorators";
import type { StaffRole } from "../session.types";
import { SESSION_COOKIE, SUPERADMIN_COOKIE, SessionService } from "../../modules/auth/session.service";

// Registered globally in app.module, so every route is guarded unless it
// carries @Public(). That inverts the Next.js arrangement, where a route was
// open unless the handler remembered to call requireRole — a missing call
// there was an invisible hole, whereas a missing decorator here is a 401.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerAndClass = [context.getHandler(), context.getClass()];
    const request = context.switchToHttp().getRequest<Request>();

    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, handlerAndClass)) {
      // Still attach a session when one happens to be present: some public
      // endpoints (feedback) personalise their behaviour for signed-in staff
      // without requiring it.
      request.session = (await this.sessions.verifyStaff(request.cookies?.[SESSION_COOKIE])) ?? undefined;
      return true;
    }

    if (this.reflector.getAllAndOverride<boolean>(SUPERADMIN_KEY, handlerAndClass)) {
      const admin = await this.sessions.verifySuperAdmin(request.cookies?.[SUPERADMIN_COOKIE]);
      // Deliberately the same generic message whether the cookie is absent,
      // malformed, or a vendor token — never confirm whether an account
      // exists (CLAUDE.md § Superadmin Console, rule 4).
      if (!admin) throw new UnauthorizedException({ error: "Not authorized", code: "unauthenticated" });
      request.superAdmin = admin;
      return true;
    }

    const session = await this.sessions.verifyStaff(request.cookies?.[SESSION_COOKIE]);
    if (!session) throw new UnauthorizedException({ error: "Not signed in", code: "unauthenticated" });
    request.session = session;

    const roles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, handlerAndClass);
    if (roles && roles.length > 0 && !roles.includes(session.role)) {
      throw new ForbiddenException({ error: "You don't have permission to do this", code: "forbidden" });
    }

    return true;
  }
}
