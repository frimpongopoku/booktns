import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SuperAdminController } from "./superadmin.controller";
import { SuperAdminService } from "./superadmin.service";

// Imports AuthModule for SessionService (issueSuperAdminToken) — the same
// token-minting logic the vendor sign-in flow uses, just a different secret
// and payload shape.
@Module({ imports: [AuthModule], controllers: [SuperAdminController], providers: [SuperAdminService] })
export class SuperAdminModule {}
