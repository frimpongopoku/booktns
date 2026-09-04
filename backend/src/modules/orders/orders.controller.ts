import { Body, Controller, Get, Param, Patch, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentSession, Public, Roles } from "../../common/decorators";
import { ZodValidationPipe } from "../../common/zod.pipe";
import type { SessionPayload } from "../../common/session.types";
import { OrdersService } from "./orders.service";
import { createOrderSchema, updateOrderSchema, type CreateOrderDto, type UpdateOrderDto } from "./orders.schemas";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post()
  create(@Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Roles("Owner", "Management")
  @Get()
  list(@CurrentSession() session: SessionPayload) {
    return this.orders.list(session.vendorId);
  }

  @Roles("Owner", "Management")
  @Patch(":id")
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateOrderSchema)) dto: UpdateOrderDto,
    @CurrentSession() session: SessionPayload,
  ) {
    return this.orders.updateStatus(session.vendorId, id, dto);
  }
}

@Public()
@Controller("orders/by-slug")
export class OrdersPdfController {
  constructor(private readonly orders: OrdersService) {}

  @Get(":slug/pdf")
  async pdf(@Param("slug") slug: string, @Res() res: Response) {
    const url = await this.orders.getConfirmationPdfUrl(slug);
    res.redirect(url);
  }
}
