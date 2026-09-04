import { Module } from "@nestjs/common";
import { VendorController, VendorHoursController, VendorDomainController, VendorsController } from "./vendor.controller";
import { VendorService } from "./vendor.service";

@Module({
  controllers: [VendorController, VendorHoursController, VendorDomainController, VendorsController],
  providers: [VendorService],
})
export class VendorModule {}
