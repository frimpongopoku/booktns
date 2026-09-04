import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { PUBLIC_KEY, ROLES_KEY, SUPERADMIN_KEY } from "../decorators";
import type { StaffRole } from "../session.types";
import { SessionService, bearerToken } from "../../modules/auth/session.service";

// Registered globally in app.module, so every route is authenticated unless
// it carries @Public(). That inverts the Next.js arrangement, where a route
// was open unless the handler remembered to call requireRole — a forgotten
// call there was an invisible hole; a forgotten decorator here is a 401.
//
// Reads ONLY the Authorization header. This API never looks at cookies —
// see session.service.ts for why that is the load-bearing decision behind
// custom-domain support.
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerAndClass = [context.getHandler(), context.getClass()];
    const request = context.switchToHttp().getRequest<Request>();
    const token = bearerToken(request.headers.authorization);

    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, handlerAndClass)) {
      // Attach a session when a token happens to be present: some public
      // endpoints (feedback) personalise for signed-in staff without
      // requiring it.
      request.session = (await this.sessions.verifyStaff(token)) ?? undefined;
      return true;
    }

    if (this.reflector.getAllAndOverride<boolean>(SUPERADMIN_KEY, handlerAndClass)) {
      const admin = await this.sessions.verifySuperAdmin(token);
      // Same generic message whether the token is absent, malformed, or a
      // vendor token — never confirm whether an account exists
      // (CLAUDE.md § Superadmin Console, rule 4).
      if (!admin) throw new UnauthorizedException({ error: "Not authorized", code: "unauthenticated" });
      request.superAdmin = admin;
      return true;
    }

    const session = await this.sessions.verifyStaff(token);
    if (!session) throw new UnauthorizedException({ error: "Not signed in", code: "unauthenticated" });
    request.session = session;

    const roles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, handlerAndClass);
    if (roles && roles.length > 0 && !roles.includes(session.role)) {
      throw new ForbiddenException({ error: "You don't have permission to do this", code: "forbidden" });
    }

    return true;
  }
}
