import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentSession, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { PaymentsService } from "./payments.service";
import {
  createPaymentMethodSchema, updatePaymentMethodSchema,
  type CreatePaymentMethodDto, type UpdatePaymentMethodDto,
} from "./payments.schemas";

// Owner-only end to end — CLAUDE.md § role table: "Payment settings" has no
// Management exception.
@Roles("Owner")
@Controller("payment-methods")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentSession() session: SessionPayload) {
    return this.payments.list(session.vendorId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPaymentMethodSchema)) dto: CreatePaymentMethodDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.payments.create(session.vendorId, dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePaymentMethodSchema)) dto: UpdatePaymentMethodDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.payments.update(session.vendorId, id, dto);
  }

  @Delete(":id")
  archive(@Param("id") id: string, @CurrentSession() session: SessionPayload) {
    return this.payments.archive(session.vendorId, id);
  }
}
