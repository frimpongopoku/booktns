import type { SessionPayload, SuperAdminPayload } from "./session.types";

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
      superAdmin?: SuperAdminPayload;
    }
  }
}

export {};
