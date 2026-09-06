import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentSuperAdmin, Public, SuperAdminOnly } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SuperAdminPayload } from "../../common/session.types";
import { SuperAdminService } from "./superadmin.service";
import {
  superAdminSignInSchema, type SuperAdminSignInDto,
  inviteAdminSchema, type InviteAdminDto,
  vendorActionSchema, type VendorActionDto,
  reviewVerificationSchema, type ReviewVerificationDto,
} from "./superadmin.schemas";

// The whole platform console. @SuperAdminOnly() at the class level (matches
// VerificationController's @Roles("Owner")-at-class-level convention) — the
// one @Public() method below overrides it per-handler, since the guard
// checks handler metadata before falling back to the class (see
// SessionGuard.canActivate).
@SuperAdminOnly()
@Controller("superadmin")
export class SuperAdminController {
  constructor(private readonly superadmin: SuperAdminService) {}

  // Cookie-blind, like every other auth endpoint: returns the JWT in the
  // body. Only a Next.js route handler ever turns this into a cookie.
  @Public()
  @Post("auth/session")
  signIn(@Body(new ZodValidationPipe(superAdminSignInSchema)) dto: SuperAdminSignInDto) {
    return this.superadmin.signIn(dto.idToken);
  }

  @Get("overview")
  overview() {
    return this.superadmin.overview();
  }

  @Get("admins")
  listAdmins() {
    return this.superadmin.listAdmins();
  }

  @Post("admins")
  inviteAdmin(
    @Body(new ZodValidationPipe(inviteAdminSchema)) dto: InviteAdminDto,
    @CurrentSuperAdmin() admin: SuperAdminPayload,
  ) {
    return this.superadmin.inviteAdmin(dto, admin.email);
  }

  @Delete("admins/:id")
  removeAdmin(@Param("id") id: string, @CurrentSuperAdmin() admin: SuperAdminPayload) {
    return this.superadmin.removeAdmin(id, admin.sub);
  }

  @Get("vendors")
  listVendors(@Query("q") q?: string) {
    return this.superadmin.listVendors(q);
  }

  @Get("vendors/:id")
  vendorDetail(@Param("id") id: string) {
    return this.superadmin.getVendorDetail(id);
  }

  @Patch("vendors/:id")
  vendorAction(@Param("id") id: string, @Body(new ZodValidationPipe(vendorActionSchema)) dto: VendorActionDto) {
    return this.superadmin.applyVendorAction(id, dto);
  }

  @Get("verifications")
  listVerifications() {
    return this.superadmin.listVerifications();
  }

  @Get("verifications/:id")
  verificationDetail(@Param("id") id: string) {
    return this.superadmin.getVerificationDetail(id);
  }

  @Patch("verifications/:id")
  reviewVerification(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reviewVerificationSchema)) dto: ReviewVerificationDto,
    @CurrentSuperAdmin() admin: SuperAdminPayload,
  ) {
    return this.superadmin.reviewVerification(id, dto, admin.sub);
  }

  @Get("verifications/:id/photo/:kind")
  async photo(@Param("id") id: string, @Param("kind") kind: string, @Res() res: Response) {
    if (kind !== "id" && kind !== "selfie") {
      throw new BadRequestException({ error: 'kind must be "id" or "selfie"', code: "invalid_request" });
    }
    const { buffer, contentType } = await this.superadmin.getVerificationPhoto(id, kind);
    // Never cached by a browser, a proxy, or a CDN — these are government ID
    // scans; a cached copy sitting in shared infrastructure defeats the
    // point of the private bucket.
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Type", contentType);
    res.send(buffer);
  }
}
