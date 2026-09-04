import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentSession, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { StaffService } from "./staff.service";
import { createStaffSchema, updateStaffSchema, type CreateStaffDto, type UpdateStaffDto } from "./staff.schemas";

// "Manage staff" (create/edit/deactivate) is Owner-only per CLAUDE.md's role
// table, enforced on each mutating method below. Listing is opened to
// Management too: Management can "manage bookings" per the same table, which
// means assigning a booking to a staff member, which means reading this
// list — the dashboard's booking-assignment dropdown is the caller.
@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Roles("Owner", "Management")
  @Get()
  list(@CurrentSession() session: SessionPayload) {
    return this.staff.list(session.vendorId);
  }

  @Roles("Owner")
  @Post()
  create(@Body(new ZodValidationPipe(createStaffSchema)) dto: CreateStaffDto, @CurrentSession() session: SessionPayload) {
    return this.staff.create(session.vendorId, dto);
  }

  @Roles("Owner")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) dto: UpdateStaffDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.staff.update(session.vendorId, id, dto);
  }

  @Roles("Owner")
  @Delete(":id")
  archive(@Param("id") id: string, @CurrentSession() session: SessionPayload) {
    return this.staff.archive(session.vendorId, id);
  }
}
