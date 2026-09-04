import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Query } from "@nestjs/common";
import { CurrentSession, Public, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import { config } from "../../common/config";
import type { SessionPayload } from "../../common/session.types";
import { VendorService } from "./vendor.service";
import { updateVendorSchema, updateHoursSchema, addDomainSchema, checkSlugSchema, type UpdateVendorDto, type UpdateHoursDto } from "./vendor.schemas";

@Controller("vendor")
export class VendorController {
  constructor(private readonly vendor: VendorService) {}

  // Any authenticated role — see VendorService.dashboardContext.
  @Get("dashboard-context")
  dashboardContext(@CurrentSession() session: SessionPayload) {
    return this.vendor.dashboardContext(session.vendorId);
  }

  @Roles("Owner")
  @Get()
  get(@CurrentSession() session: SessionPayload) {
    return this.vendor.get(session.vendorId);
  }

  @Roles("Owner")
  @Patch()
  update(@Body(new ZodValidationPipe(updateVendorSchema)) dto: UpdateVendorDto, @CurrentSession() session: SessionPayload) {
    return this.vendor.update(session.vendorId, dto);
  }
}

@Roles("Owner")
@Controller("vendor/hours")
export class VendorHoursController {
  constructor(private readonly vendor: VendorService) {}

  @Get()
  get(@CurrentSession() session: SessionPayload) {
    return this.vendor.getHours(session.vendorId);
  }

  @Patch()
  update(@Body(new ZodValidationPipe(updateHoursSchema)) dto: UpdateHoursDto, @CurrentSession() session: SessionPayload) {
    return this.vendor.updateHours(session.vendorId, dto);
  }
}

@Roles("Owner")
@Controller("vendor/domain")
export class VendorDomainController {
  constructor(private readonly vendor: VendorService) {}

  @Get()
  get(@CurrentSession() session: SessionPayload) {
    return this.vendor.getDomain(session.vendorId);
  }

  @Post()
  add(@Body() body: unknown, @CurrentSession() session: SessionPayload) {
    const platformHostname = new URL(config.appUrl).hostname;
    const parsed = addDomainSchema(platformHostname).safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        error: parsed.error.issues[0]?.message ?? "Invalid request",
        code: "invalid_request",
      });
    }
    return this.vendor.addDomain(session.vendorId, parsed.data.domain);
  }

  @Delete()
  remove(@CurrentSession() session: SessionPayload) {
    return this.vendor.removeDomain(session.vendorId);
  }
}

// Public — a signup form checks slug availability before the vendor exists,
// so there's no session to gate this on.
@Public()
@Controller("vendors")
export class VendorsController {
  constructor(private readonly vendor: VendorService) {}

  @Get("check-slug")
  async checkSlug(@Query("slug") slug: string) {
    const parsed = checkSlugSchema.safeParse({ slug: slug ?? "" });
    if (!parsed.success) {
      throw new BadRequestException({ error: "Invalid slug format", code: "invalid_request" });
    }
    return this.vendor.checkSlug(parsed.data.slug);
  }
}
