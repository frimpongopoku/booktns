import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentSession, Public, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { BookingsService } from "./bookings.service";
import {
  createBookingSchema, updateBookingSchema, selfServiceUpdateSchema,
  type CreateBookingDto, type UpdateBookingDto, type SelfServiceUpdateDto,
} from "./bookings.schemas";

@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // Public: customers are always guests, there are no customer accounts.
  @Public()
  @Post()
  create(@Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  // Service staff are allowed here (spec §7.4 grants "view own bookings"
  // even though it withholds "manage bookings"); the service narrows the
  // query for them.
  @Roles("Owner", "Management", "Service")
  @Get()
  list(@CurrentSession() session: SessionPayload) {
    return this.bookings.list(session.vendorId, session.staffId, session.role === "Service");
  }

  @Roles("Owner", "Management")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBookingSchema)) dto: UpdateBookingDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.bookings.update(session.vendorId, id, dto);
  }
}


@Public()
@Controller("bookings/by-slug")
export class BookingsSelfServiceController {
  constructor(private readonly bookings: BookingsService) {}

  @Patch(":slug")
  update(@Param("slug") slug: string, @Body(new ZodValidationPipe(selfServiceUpdateSchema)) dto: SelfServiceUpdateDto) {
    return this.bookings.selfServiceUpdate(slug, dto);
  }
}
