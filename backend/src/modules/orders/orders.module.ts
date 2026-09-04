import { Module } from "@nestjs/common";
import { OrdersController, OrdersPdfController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({ controllers: [OrdersController, OrdersPdfController], providers: [OrdersService] })
export class OrdersModule {}
