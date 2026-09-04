import { Module } from "@nestjs/common";
import { BookingsController, BookingsSelfServiceController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({ controllers: [BookingsController, BookingsSelfServiceController], providers: [BookingsService] })
export class BookingsModule {}
