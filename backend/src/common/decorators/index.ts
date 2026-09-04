import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { SessionPayload, StaffRole, SuperAdminPayload } from "../session.types";

export const ROLES_KEY = "booktns:roles";
export const PUBLIC_KEY = "booktns:public";
export const SUPERADMIN_KEY = "booktns:superadmin";

// Replaces `requireRole([...])` from the Next.js routes. Applied per handler
// or per controller; the guard reads it. Absent = authenticated staff of any
// role, which is deliberately the safe default — a new endpoint is protected
// unless someone opts it out.
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);

// Explicit opt-out for the genuinely public surface: creating a booking or
// order as a guest customer, the storefront reads, health checks, sign-in.
export const Public = () => SetMetadata(PUBLIC_KEY, true);

// Platform console. A separate token kind and cookie, never interchangeable
// with a vendor session.
export const SuperAdminOnly = () => SetMetadata(SUPERADMIN_KEY, true);

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionPayload =>
    ctx.switchToHttp().getRequest().session,
);

export const CurrentSuperAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SuperAdminPayload =>
    ctx.switchToHttp().getRequest().superAdmin,
);
